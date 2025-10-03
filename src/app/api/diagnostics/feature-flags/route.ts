import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        // no cookies storage for backend route
      } as any
    );

    const { data, error } = await supabase.from('feature_flags').select('*');
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true, count: data?.length ?? 0, flags: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown error' }, { status: 200 });
  }
}
