import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { logSecurityEvent, SecurityEventTypes } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email.toLowerCase())
      .single();
      
    if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking user existence:', userError);
      return NextResponse.json(
        { error: 'An error occurred while checking user account' },
        { status: 500 }
      );
    }
    
    // Generate and store verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code valid for 15 minutes
    
    const { error: codeError } = await supabase
      .from('email_verification_codes')
      .insert({
        email: email.toLowerCase(),
        code: verificationCode,
        purpose: 'mfa_recovery',
        expires_at: expiresAt.toISOString(),
      });
      
    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }
    
    // In a real application, send email with verification code
    // For now, just log it (in production this should use a proper email service)
    console.log(`[MFA Recovery] Verification code for ${email}: ${verificationCode}`);
    
    // Log security event if user exists
    if (userExists) {
      await logSecurityEvent({
        userId: userExists.user_id,
        event: SecurityEventTypes.MFA_RECOVERY_INITIATED,
        details: { email },
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error initiating recovery:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
