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

    console.log('🔐 Admin signin attempt for:', email);

    // Use admin client to sign in (bypasses rate limits)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.error('❌ Admin signin error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed. Please check your credentials.' 
      }, { status: 400 });
    }

    // Generate session for the user
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email
    });

    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create session' 
      }, { status: 500 });
    }

    console.log('✅ Admin signin successful');
    return NextResponse.json({ 
      success: true, 
      user: data.user,
      session: session
    });

  } catch (error) {
    console.error('💥 Admin signin error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error during authentication' 
    }, { status: 500 });
  }
}