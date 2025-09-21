import { NextRequest, NextResponse } from 'next/server';
import { CeloraWalletService } from '@celora/infrastructure';

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json();
    const { userId, pin } = body;
    const resolvedParams = await params;
    const { cardId } = resolvedParams;

    if (!userId || !pin || !cardId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize service with environment variables
    const walletService = new CeloraWalletService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.CELORA_ENCRYPTION_KEY
    );

    const result = await walletService.getCardDetails(userId, cardId, pin);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cardData: result.cardData
    });

  } catch (error) {
    console.error('Get card details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}