import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function unauthorized() { return NextResponse.json({ error: 'Authentication required' }, { status: 401 }); }
function notFound() { return NextResponse.json({ error: 'Card not found' }, { status: 404 }); }

// GET /api/cards/[id]/risk - Get fraud risk score for card (owner-only)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabaseUser = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseUser.auth.getSession();
  if (!session) return unauthorized();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Verify ownership and fetch recent transactions for heuristic
  const { data: card, error: cardErr } = await admin
    .from('virtual_cards')
    .select('id,user_id,currency')
    .eq('id', id)
    .single();
  if (cardErr || !card) return notFound();
  if (card.user_id !== session.user.id) return unauthorized();

  // Simple heuristic based on last 20 transactions: many declines/high amounts increase risk
  const { data: txns } = await admin
    .from('transactions')
    .select('amount,status,created_at')
    .eq('card_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  let riskScore = 0.05; // base
  const total = txns?.length || 0;
  const declines = txns?.filter(t => t.status === 'declined').length || 0;
  const highValue = txns?.filter(t => Number(t.amount) > 500).length || 0;

  riskScore += Math.min(0.5, declines * 0.03);
  riskScore += Math.min(0.3, highValue * 0.02);
  if (total >= 15 && declines / Math.max(1, total) > 0.25) riskScore += 0.15;
  riskScore = Math.min(0.99, Number(riskScore.toFixed(2)));

  const riskLevel = riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low';

  return NextResponse.json({ id, riskScore, riskLevel, totalAnalyzed: total }, { status: 200 });
}