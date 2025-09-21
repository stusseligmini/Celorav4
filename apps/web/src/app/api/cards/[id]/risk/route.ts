import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@celora/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/cards/[id]/risk - Get fraud risk score for card
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = new SupabaseService();
    const riskScore = await supabaseService.getCardRiskScore(params.id, user.id);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.6) riskLevel = 'medium';
    else riskLevel = 'high';

    return NextResponse.json({ 
      cardId: params.id,
      riskScore: Math.round(riskScore * 100) / 100, // Round to 2 decimals
      riskLevel,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Risk score fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}