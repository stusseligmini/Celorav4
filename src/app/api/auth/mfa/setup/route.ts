import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

// Setup MFA for a user
export async function POST(request: Request) {
  try {
    // Get the current user from their session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'You must be logged in to set up MFA', 
        success: false 
      }, { status: 401 });
    }
    
    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Celora:${user.email || user.id}`
    });
    
    // Generate recovery codes using the database function
    const { data: recoveryCodes, error: recoveryError } = await supabase.rpc(
      'generate_recovery_codes'
    );
    
    if (recoveryError) {
      console.error('Error generating recovery codes:', recoveryError);
      return NextResponse.json({ 
        error: 'Failed to generate recovery codes',
        success: false 
      }, { status: 500 });
    }
    
    // Return the secret and recovery codes
    return NextResponse.json({ 
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
      recoveryCodes,
      success: true 
    });
  } catch (err) {
    console.error('Error setting up MFA:', err);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      success: false 
    }, { status: 500 });
  }
}