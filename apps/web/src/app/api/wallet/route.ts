import { NextRequest, NextResponse } from 'next/server';
import { CeloraWalletService } from '@celora/infrastructure';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, walletType, address, privateKey, pin } = body;

    // Basic validation
    if (!userId || !walletType || !address || !privateKey || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['solana', 'ethereum', 'bitcoin'].includes(walletType)) {
      return NextResponse.json(
        { error: 'Invalid wallet type' },
        { status: 400 }
      );
    }

    // Initialize service with environment variables
    const walletService = new CeloraWalletService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.CELORA_ENCRYPTION_KEY
    );

    const result = await walletService.createWallet(
      userId,
      walletType as 'solana' | 'ethereum' | 'bitcoin',
      address,
      privateKey,
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
      walletId: result.walletId
    });

  } catch (error) {
    console.error('Create wallet API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Initialize service with environment variables
    const walletService = new CeloraWalletService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.CELORA_ENCRYPTION_KEY
    );

    const assets = await walletService.listUserAssets(userId);

    return NextResponse.json({
      success: true,
      data: assets
    });

  } catch (error) {
    console.error('List wallets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}