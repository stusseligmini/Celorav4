import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock crypto holdings data
    const holdings = {
      totalValue: 12847.55,
      currency: 'USD',
      portfolioChange24h: 2.45,
      holdings: [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          amount: 0.28445,
          currentPrice: 43250.00,
          value: 12305.62,
          change24h: 1.85,
          allocation: 95.8
        },
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          amount: 0.15632,
          currentPrice: 2685.40,
          value: 419.78,
          change24h: -0.92,
          allocation: 3.3
        },
        {
          id: 'solana',
          symbol: 'SOL',
          name: 'Solana',
          amount: 1.2458,
          currentPrice: 98.12,
          value: 122.15,
          change24h: 5.67,
          allocation: 0.9
        }
      ],
      recentTransactions: [
        {
          id: 'tx_001',
          type: 'buy',
          symbol: 'BTC',
          amount: 0.01234,
          price: 43180.00,
          timestamp: '2025-09-23T10:30:00Z'
        },
        {
          id: 'tx_002', 
          type: 'sell',
          symbol: 'ETH',
          amount: 0.05000,
          price: 2690.00,
          timestamp: '2025-09-22T15:45:00Z'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: holdings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching crypto holdings:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch crypto holdings' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbol, amount, walletAddress } = body;

    // Mock transaction response
    const transaction = {
      id: `tx_${Date.now()}`,
      action,
      symbol,
      amount,
      walletAddress,
      status: 'pending',
      timestamp: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 300000).toISOString() // 5 minutes
    };

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `${action} order for ${amount} ${symbol} submitted successfully`
    });

  } catch (error) {
    console.error('Error processing crypto transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process crypto transaction' 
      },
      { status: 500 }
    );
  }
}