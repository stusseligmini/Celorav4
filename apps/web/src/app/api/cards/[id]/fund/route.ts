import { NextResponse } from 'next/server';
import { SupabaseService } from '@celora/infrastructure';
import { VirtualCardDomain } from '@celora/domain';

// NOTE: Authentication placeholder - integrate real session/user extraction.
async function getUserId(req: Request): Promise<string | null> {
  // Later: derive from auth cookie / header. For now, accept x-user-id header for local dev.
  const v = req.headers.get('x-user-id');
  return v && v.length > 0 ? v : null;
}

// Next.js Route Handler: context object (with params) is the second arg; ensure types align.
export async function POST(req: Request, context: any) {
  const params = (context as { params: { id: string } }).params;
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cardId = params.id;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const amount = Number(body?.amount);
  if (!amount || isNaN(amount)) return NextResponse.json({ error: 'Amount required' }, { status: 400 });

  const supabase = new SupabaseService(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  // Fetch card
  const { data: card, error } = await (supabase as any).supabase
    .from('virtual_cards')
    .select('*')
    .eq('id', cardId)
    .single();
  if (error || !card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  if (card.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Basic closed-card validation; additional business logic may be added later
  if (card.status === 'closed') return NextResponse.json({ error: 'Card closed' }, { status: 400 });
  if (amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

  const result = await supabase.addFunds({ cardId, amount, currency: card.currency, sourceType: 'external_wallet' });
  if (!result.success) return NextResponse.json({ error: result.reason || 'Funding failed' }, { status: 400 });

  return NextResponse.json({
    success: true,
    transactionId: result.transactionId,
    newBalance: result.newBalance
  });
}
