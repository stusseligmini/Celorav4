import { NextRequest, NextResponse } from 'next/server';
import { CeloraWalletService } from '@celora/infrastructure';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cardNumber, expiry, cvv, pin } = body;

    // Basic validation
    if (!userId || !cardNumber || !expiry || !cvv || !pin) {
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

    const result = await walletService.addVirtualCard(
      userId,
      cardNumber,
      expiry,
      cvv,
      pin
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cardId: result.cardId
    });

  } catch (error) {
    console.error('Add card API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}