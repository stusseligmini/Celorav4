import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass all rate limits
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('👤 Creating new user via admin API:', email);

    // Create user directly via admin API (no rate limits)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_via: 'admin_api',
        created_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error('❌ User creation error:', error);
      
      if (error.message.includes('already registered')) {
        return NextResponse.json({ 
          success: false, 
          error: 'A user with this email already exists. Please try signing in instead.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create account. Please try again.' 
      }, { status: 400 });
    }

    // Create user profile (align with schema: primary key is `id` referencing auth.users)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        full_name: ''
      });

    if (profileError) {
      console.error('⚠️ Profile creation error:', profileError);
      // Don't fail the whole process for profile errors
    }

    console.log('✅ User created successfully via admin API');
    return NextResponse.json({ 
      success: true, 
      user: data.user,
      message: 'Account created successfully! You can now sign in.'
    });

  } catch (error) {
    console.error('💥 Admin user creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error during account creation' 
    }, { status: 500 });
  }
}