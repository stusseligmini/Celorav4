import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { QuantumNeuralEngine } from '@celora/quantum';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { cardId, amount, merchantName, type = 'purchase' } = body || {};
  if (!cardId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'cardId and amount required' }, { status: 400 });
  }
  const { data: card, error: cardErr } = await supabaseAdmin
    .from('virtual_cards')
    .select('id,user_id,status,balance')
    .eq('id', cardId)
    .single();
  if (cardErr || !card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  if (card.status !== 'active') return NextResponse.json({ error: 'Card not active' }, { status: 400 });

  const engine = new QuantumNeuralEngine();
  const fraud = await engine.analyzeFraud({
    amount: Math.abs(amount),
    timestamp: Date.now(),
    source: 'virtual_card',
    destination: merchantName || 'merchant',
    blockConfidence: 1
  });

  const recommended = fraud.recommendedAction;
  const status = recommended === 'block' ? 'failed' : 'completed';
  const newBalance = type === 'purchase' ? Number(card.balance) - Math.abs(amount) : Number(card.balance) + Math.abs(amount);
  if (newBalance < 0) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Non-atomic multi-step; TODO: replace with Postgres function transaction
  const { error: updateErr } = await supabaseAdmin
    .from('virtual_cards')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', card.id);
  if (updateErr) return NextResponse.json({ error: 'Balance update failed' }, { status: 500 });

  const { data: txn, error: txnErr } = await supabaseAdmin
    .from('transactions')
    .insert({
      card_id: card.id,
      user_id: card.user_id,
      amount: type === 'purchase' ? -Math.abs(amount) : Math.abs(amount),
      currency: 'USD',
      transaction_type: type,
      status,
      merchant_name: merchantName || null,
      metadata: { fraud }
    })
    .select()
    .single();
  if (txnErr) return NextResponse.json({ error: 'Transaction insert failed' }, { status: 500 });

  return NextResponse.json({ transaction: txn, fraud });
}
