import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

// Verify MFA token during login
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, tempToken, isRecoveryCode = false } = body;
    
    if (!token || !tempToken) {
      return NextResponse.json({ 
        error: 'Verification code and temporary token are required',
        success: false 
      }, { status: 400 });
    }

    // Parse temporary token to get user ID
    if (!tempToken.includes('_')) {
      return NextResponse.json({ 
        error: 'Invalid temporary token', 
        success: false 
      }, { status: 400 });
    }

    const userId = tempToken.split('_')[0];
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Validate the token expiry (10 minutes)
    const tokenTimestamp = parseInt(tempToken.split('_')[1]);
    const now = new Date().getTime();
    if (now - tokenTimestamp > 10 * 60 * 1000) {
      return NextResponse.json({ 
        error: 'Verification session expired. Please log in again.', 
        success: false 
      }, { status: 400 });
    }

    if (isRecoveryCode) {
      // Verify recovery code using the database function
      const { data: verifyResult, error: verifyError } = await supabase.rpc(
        'verify_recovery_code',
        {
          p_user_id: userId,
          p_code: token
        }
      );
      
      if (verifyError || !verifyResult) {
        return NextResponse.json({ 
          error: 'Invalid recovery code', 
          success: false 
        }, { status: 400 });
      }
    } else {
      // Get the user's MFA secret
      const { data, error } = await supabase
        .from('user_profiles')
        .select('mfa_secret')
        .eq('id', userId)
        .single();
      
      if (error || !data?.mfa_secret) {
        return NextResponse.json({ 
          error: 'Failed to verify MFA', 
          success: false 
        }, { status: 500 });
      }
      
      // Verify the provided token against the secret
      const isValid = speakeasy.totp.verify({
        secret: data.mfa_secret,
        encoding: 'base32',
        token: token.replace(/\s+/g, '')
      });
      
      if (!isValid) {
        // Log failed attempt
        await supabase
          .from('mfa_verification_log')
          .insert([
            {
              user_id: userId,
              success: false
            }
          ]);
          
        return NextResponse.json({ 
          error: 'Invalid verification code', 
          success: false 
        }, { status: 400 });
      }
    }
    
    // Log successful attempt
    await supabase
      .from('mfa_verification_log')
      .insert([
        {
          user_id: userId,
          success: true
        }
      ]);
    
    // Update last verified timestamp
    await supabase
      .from('user_profiles')
      .update({
        mfa_last_verified: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Create a login session for the user using admin functionality
    // This requires a server-side component
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData?.user) {
      return NextResponse.json({ 
        error: 'Failed to authenticate user after MFA verification', 
        success: false 
      }, { status: 500 });
    }
    
    // Get the user's email for sign-in
    const { data: userData, error: userDataError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userDataError || !userData?.email) {
      return NextResponse.json({ 
        error: 'Failed to get user data for authentication', 
        success: false 
      }, { status: 500 });
    }
    
    // Create a new sign-in link
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}`
      }
    });
    
    if (signInError) {
      return NextResponse.json({ 
        error: 'Failed to create session after MFA verification', 
        success: false 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      session: signInData
    });
  } catch (err) {
    console.error('Error verifying MFA:', err);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      success: false 
    }, { status: 500 });
  }
}