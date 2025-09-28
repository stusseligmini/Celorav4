import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { logSecurityEvent, SecurityEventTypes } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if verification code is valid
    const { data: verificationData, error: codeError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('purpose', 'mfa_recovery')
      .gt('expires_at', new Date().toISOString())
      .single();
      
    if (codeError || !verificationData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    // Mark the code as used
    await supabase
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);
      
    // Check if user exists
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email.toLowerCase())
      .single();
      
    // Log security event if user exists
    if (userProfile) {
      await logSecurityEvent({
        userId: userProfile.user_id,
        event: SecurityEventTypes.MFA_RECOVERY_INITIATED,
        details: { email, step: 'email_verified' },
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });
    }
    
    return NextResponse.json({ verified: true });
    
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}