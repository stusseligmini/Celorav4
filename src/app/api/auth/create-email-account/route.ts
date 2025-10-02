import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Email Backup API: Starting account creation...');
    
    const { email, password, fullName } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('❌ Invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      console.error('❌ Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      console.error('❌ Full name is required');
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    console.log('📧 Creating email account:', email);
    console.log('👤 Full name:', fullName);

    // Check if user already exists first (prevent duplicates)
    console.log('🔍 Checking for existing user...');
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);
      if (existing) {
        console.log('⚠️ User already exists with this email');
        return NextResponse.json(
          { error: 'An account with this email already exists. Please try signing in instead.' },
          { status: 409 }
        );
      }
    } catch (checkError) {
      console.log('ℹ️ Could not check existing user (continuing with creation)...');
    }

    // Create user with admin API (bypasses captcha completely)
    console.log('🔐 Creating user with admin API...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        full_name: fullName,
        wallet_type: 'email'
      },
      email_confirm: true // Auto-confirm email
    });

    if (error) {
      console.error('❌ Admin create user error:', error);
      
      // Handle specific errors
      if (error.message.toLowerCase().includes('already registered') || 
          error.message.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please try signing in instead.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create account: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ User created successfully:', data.user?.id);

    // Create profile in database (using your existing table structure)
    if (data.user) {
      console.log('👤 Creating user profile...');
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              full_name: fullName,
              wallet_type: 'email',
              is_verified: false,
              kyc_status: 'pending',
              created_at: new Date().toISOString()
            }
          ]);

        if (profileError) {
          console.warn('⚠️ Profile creation failed (may already exist):', profileError.message);
        } else {
          console.log('✅ Profile created successfully');
        }
      } catch (profileError) {
        console.warn('⚠️ Profile creation error:', profileError);
      }
    }

    console.log('🎉 Email account creation completed successfully');
    return NextResponse.json(
      { 
        success: true, 
        message: 'Account created successfully via admin API',
        user: {
          id: data.user.id,
          email: email,
          full_name: fullName,
          wallet_type: 'email'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 Email account creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during account creation' },
      { status: 500 }
    );
  }
}
