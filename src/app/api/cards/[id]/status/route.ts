import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Helpers
function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
function unauthorized() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
function notFound(msg = 'Card not found') {
  return NextResponse.json({ error: msg }, { status: 404 });
}

// GET /api/cards/[id]/status - Get current card status (owner-only)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return badRequest('Missing card id');

  const supabaseUser = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseUser.auth.getSession();
  if (!session) return unauthorized();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: card, error } = await admin
    .from('virtual_cards')
    .select('id,status,user_id')
    .eq('id', id)
    .single();

  if (error || !card) return notFound();
  if (card.user_id !== session.user.id) return unauthorized();

  return NextResponse.json({ id: card.id, status: card.status }, { status: 200 });
}

// PATCH /api/cards/[id]/status - Toggle/Set status (owner-only: active<->suspended)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return badRequest('Missing card id');

  const supabaseUser = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseUser.auth.getSession();
  if (!session) return unauthorized();

  let body: { status?: string } = {};
  try { body = await request.json(); } catch {}

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Fetch to verify ownership and current status
  const { data: card, error } = await admin
    .from('virtual_cards')
    .select('id,status,user_id')
    .eq('id', id)
    .single();
  if (error || !card) return notFound();
  if (card.user_id !== session.user.id) return unauthorized();

  // Compute next status
  const allowed = ['active', 'suspended'];
  const nextStatus = body.status && allowed.includes(body.status) ? body.status : (card.status === 'active' ? 'suspended' : 'active');
  if (!allowed.includes(nextStatus)) return badRequest('Invalid status');

  const { error: updErr } = await admin
    .from('virtual_cards')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', card.id);

  if (updErr) return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });

  return NextResponse.json({ success: true, id: card.id, status: nextStatus }, { status: 200 });
}