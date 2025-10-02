import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock Solana wallet and transaction data
    const solanaData = {
      wallet: {
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        balance: 1.2458,
        balanceUSD: 122.15,
        network: 'mainnet-beta'
      },
      currentPrice: {
        usd: 98.12,
        change24h: 5.67,
        marketCap: 45672345000,
        volume24h: 1234567890
      },
      recentTransactions: [
        {
          signature: '4YzKmm8T2xNkBJ8KzXjgKcGPqFKdNqjGJhv1dV6eC3zL9WqR7S2H1X',
          type: 'transfer',
          amount: 0.5,
          direction: 'outbound',
          to: '7NWuQJnbJJ8FZBNGpqfKdNqjGJhv1dV6eC3zL9WqR7S2H1X',
          timestamp: '2025-09-23T09:15:00Z',
          status: 'confirmed',
          fee: 0.000005
        },
        {
          signature: '3XrHmm7T1xNkBJ8KzXjgKcGPqFKdNqjGJhv2dV7eC4zL8WqR6S3H2X',
          type: 'swap',
          amount: 0.1,
          direction: 'swap',
          from: 'SOL',
          to: 'USDC',
          timestamp: '2025-09-22T14:30:00Z',
          status: 'confirmed',
          fee: 0.000008
        }
      ],
      staking: {
        totalStaked: 0.75,
        rewards: 0.0245,
        apr: 6.8,
        validator: 'Marinade.Finance',
        nextReward: '2025-09-24T12:00:00Z'
      },
      tokenAccounts: [
        {
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          balance: 1.2458,
          decimals: 9
        },
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          name: 'USD Coin',
          balance: 45.32,
          decimals: 6
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: solanaData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching Solana data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch Solana wallet data' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, amount, recipient, tokenMint } = body;

    // Mock Solana transaction
    const transaction = {
      signature: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      action,
      amount,
      recipient,
      tokenMint: tokenMint || 'So11111111111111111111111111111111111111112',
      status: 'pending',
      timestamp: new Date().toISOString(),
      estimatedConfirmation: new Date(Date.now() + 60000).toISOString(), // 1 minute
      fee: 0.000005
    };

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `Solana ${action} transaction submitted successfully`
    });

  } catch (error) {
    console.error('Error processing Solana transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process Solana transaction' 
      },
      { status: 500 }
    );
  }
}
