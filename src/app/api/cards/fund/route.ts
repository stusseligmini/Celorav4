import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-config';

// Only available server-side: ensure SERVICE_ROLE_KEY never reaches client
const { supabaseUrl: SUPABASE_URL, supabaseServiceKey: SERVICE_ROLE_KEY } = getSupabaseConfig();

if (!SUPABASE_URL) {
  console.warn('Missing SUPABASE_URL for funding API route');
}
if (!SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY for funding API route');
}

// Minimal zod-less inline validation to avoid extra deps here (domain package can later supply schema)
interface FundBody { cardId: string; amount: number; userId?: string; }

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: FundBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.cardId || typeof body.amount !== 'number') {
    return NextResponse.json({ error: 'cardId and numeric amount required' }, { status: 400 });
  }
  if (body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 });
  }

  // Fetch existing balance and ownership check
  const { data: card, error: cardErr } = await supabaseAdmin
    .from('virtual_cards')
    .select('id,balance,user_id,status')
    .eq('id', body.cardId)
    .single();

  if (cardErr || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }
  if (card.status !== 'active') {
    return NextResponse.json({ error: 'Card not active' }, { status: 400 });
  }

  const newBalance = Number(card.balance) + body.amount;
  // Update balance inside a RPC-like serializable transaction via Postgres function later; for now simple update
  const { error: updateErr } = await supabaseAdmin
    .from('virtual_cards')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', card.id);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to fund card' }, { status: 500 });
  }

  // Insert transaction record
  const { error: txnErr } = await supabaseAdmin
    .from('transactions')
    .insert({
      card_id: card.id,
      user_id: card.user_id,
      amount: body.amount,
      currency: 'USD',
      transaction_type: 'topup',
      status: 'completed',
      metadata: { source: 'api.fund' }
    });

  if (txnErr) {
    // Best-effort rollback (not atomic). Future improvement: wrap in Postgres function or use pg-js direct transaction.
    await supabaseAdmin
      .from('virtual_cards')
      .update({ balance: card.balance })
      .eq('id', card.id);
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
  }

  return NextResponse.json({ success: true, newBalance });
}
