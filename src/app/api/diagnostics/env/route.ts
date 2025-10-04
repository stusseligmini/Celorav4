import { NextResponse } from 'next/server';

// Safe diagnostics: returns presence booleans for secrets and concrete values for non-secret public URLs
export async function GET() {
  const data = {
    required: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), // do not expose
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), // do not expose
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      WALLET_ENCRYPTION_KEY: Boolean(process.env.WALLET_ENCRYPTION_KEY), // do not expose
      MASTER_ENCRYPTION_KEY: Boolean(process.env.MASTER_ENCRYPTION_KEY), // do not expose
    },
    recommended: {
      NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || null,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
      CORS_ORIGIN: process.env.CORS_ORIGIN || null,
      ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS || null,
    },
    meta: {
      environment: process.env.NODE_ENV || 'development',
      note: 'Keys are redacted as booleans. Only non-sensitive URLs are shown.'
    }
  };

  return NextResponse.json(data, { status: 200 });
}
