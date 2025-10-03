import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type Method = 'GET' | 'POST';

async function handler(req: NextRequest, _method: Method) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) Authorize: admin session OR x-admin-token === NEXTAUTH_SECRET
    let authorized = false;
    const token = req.headers.get('x-admin-token');
    if (token && process.env.NEXTAUTH_SECRET && token === process.env.NEXTAUTH_SECRET) {
      authorized = true;
    } else {
      // Fallback to checking current Supabase user role via anon+cookies
      const supaFromCookies = createServerClient(url, anon, {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set() {},
          remove() {},
        },
      });
      const { data: userData } = await supaFromCookies.auth.getUser();
      const role = userData?.user?.user_metadata?.role as string | undefined;
      if (role === 'admin') authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    // 2) Use service role for privileged writes
    const supabase = createServerClient(url, service, {} as any);

    // Check table exists
    const probe = await supabase.from('feature_flags').select('name').limit(1);
    if (probe.error) {
      return NextResponse.json({
        ok: false,
        error: 'feature_flags table unavailable',
        hint: 'Run database/feature-flags.sql in Supabase SQL editor',
        detail: probe.error.message,
      }, { status: 200 });
    }

    const defaults = [
      { name: 'notifications', description: 'Master switch for notifications', is_enabled: true },
      { name: 'notifications_in_app', description: 'Enable in-app notifications', is_enabled: true },
      { name: 'notifications_push', description: 'Enable push notifications', is_enabled: false },
      { name: 'notifications_email', description: 'Enable email notifications', is_enabled: false },
      { name: 'notifications_sms', description: 'Enable SMS notifications', is_enabled: false },
      { name: 'new_dashboard', description: 'Enable the new dashboard interface', is_enabled: false },
      { name: 'advanced_analytics', description: 'Enable advanced analytics', is_enabled: false },
      { name: 'mfa_required', description: 'Require MFA for all users', is_enabled: false },
      { name: 'dark_mode', description: 'Enable dark mode UI theme', is_enabled: true },
      { name: 'new_card_management', description: 'Enable new card management UI', is_enabled: false },
    ];

    const { data, error } = await supabase
      .from('feature_flags')
      .upsert(defaults, { onConflict: 'name' })
      .select('name,is_enabled');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true, seeded: data?.length ?? 0, flags: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown error' }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return handler(req, 'GET');
}

export async function POST(req: NextRequest) {
  return handler(req, 'POST');
}

export const dynamic = 'force-dynamic';
