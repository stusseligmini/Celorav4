import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

// Verify and enable MFA for a user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, secret, recoveryCodes } = body;
    
    if (!token || !secret) {
      return NextResponse.json({ 
        error: 'Verification code and secret are required',
        success: false 
      }, { status: 400 });
    }

    // Get the current user from their session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'You must be logged in to enable MFA', 
        success: false 
      }, { status: 401 });
    }
    
    // Verify token first
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: token.replace(/\s+/g, '')
    });

    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid verification code', 
        success: false 
      }, { status: 400 });
    }

    // Update user profile with MFA settings
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        mfa_enabled: true,
        mfa_secret: secret,
        mfa_recovery_codes: recoveryCodes,
        mfa_last_verified: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error enabling MFA:', updateError);
      return NextResponse.json({ 
        error: 'Failed to enable MFA', 
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true 
    });
  } catch (err) {
    console.error('Error enabling MFA:', err);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      success: false 
    }, { status: 500 });
  }
}