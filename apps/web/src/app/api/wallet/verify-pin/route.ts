import { NextRequest, NextResponse } from 'next/server';
import { CeloraWalletService } from '@celora/infrastructure';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pin } = body;

    if (!userId || !pin) {
      return NextResponse.json(
        { error: 'User ID and PIN required' },
        { status: 400 }
      );
    }

    // Initialize service with environment variables
    const walletService = new CeloraWalletService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.CELORA_ENCRYPTION_KEY
    );

    const result = await walletService.verifyPin(userId, pin);

    return NextResponse.json({
      success: result.success,
      error: result.error
    });

  } catch (error) {
    console.error('PIN verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}