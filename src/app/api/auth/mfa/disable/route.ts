import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

// Disable MFA for a user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Verification code is required',
        success: false 
      }, { status: 400 });
    }

    // Get the current user from their session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'You must be logged in to disable MFA', 
        success: false 
      }, { status: 401 });
    }
    
    // Get the user's MFA secret
    const { data, error } = await supabase
      .from('user_profiles')
      .select('mfa_secret, mfa_enabled')
      .eq('id', user.id)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ 
        error: 'Failed to get MFA settings', 
        success: false 
      }, { status: 500 });
    }
    
    // If MFA is not enabled, nothing to do
    if (!data.mfa_enabled) {
      return NextResponse.json({ 
        success: true 
      });
    }
    
    // Verify the token first
    const isValid = speakeasy.totp.verify({
      secret: data.mfa_secret,
      encoding: 'base32',
      token: token.replace(/\s+/g, '')
    });
    
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid verification code', 
        success: false 
      }, { status: 400 });
    }

    // Update user profile to disable MFA
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        mfa_enabled: false,
        mfa_secret: null,
        mfa_recovery_codes: null,
        mfa_verified_devices: []
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error disabling MFA:', updateError);
      return NextResponse.json({ 
        error: 'Failed to disable MFA', 
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true 
    });
  } catch (err) {
    console.error('Error disabling MFA:', err);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      success: false 
    }, { status: 500 });
  }
}