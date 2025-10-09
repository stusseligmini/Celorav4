import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Check environment variables (but don't expose actual values)
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
            `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 
            'NOT SET',
          length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
          startsWithEyJ: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
          startsWithEyJ: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false
        },
        NEXTAUTH_URL: {
          exists: !!process.env.NEXTAUTH_URL,
          value: process.env.NEXTAUTH_URL || 'NOT SET'
        }
      },
      
      // Test Supabase connection
      supabaseConnection: await testSupabaseConnection()
    };
    
    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Diagnostics failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function testSupabaseConnection() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return {
        status: 'ERROR',
        error: 'Missing environment variables',
        details: {
          hasUrl: !!url,
          hasKey: !!key
        }
      };
    }
    
    // Try to create a simple Supabase client and test connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test connection by fetching from auth (doesn't require any tables)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        status: 'ERROR',
        error: error.message,
        errorCode: error.status
      };
    }
    
    return {
      status: 'OK',
      message: 'Supabase client created successfully',
      sessionExists: !!data.session
    };
    
  } catch (error: any) {
    return {
      status: 'ERROR',
      error: error.message,
      type: error.constructor.name
    };
  }
}
