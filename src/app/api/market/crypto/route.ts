import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock crypto market data
    const marketData = {
      totalMarketCap: 2456789012345,
      totalVolume24h: 145678901234,
      btcDominance: 52.4,
      ethDominance: 17.8,
      fearGreedIndex: 65, // 0-100 scale
      topCoins: [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          currentPrice: 43250.00,
          marketCap: 845623456789,
          volume24h: 45678901234,
          change24h: 1.85,
          change7d: -2.45,
          change30d: 12.34,
          rank: 1
        },
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          currentPrice: 2685.40,
          marketCap: 323456789012,
          volume24h: 23456789012,
          change24h: -0.92,
          change7d: 3.21,
          change30d: 8.76,
          rank: 2
        },
        {
          id: 'solana',
          symbol: 'SOL',
          name: 'Solana',
          currentPrice: 98.12,
          marketCap: 45672345678,
          volume24h: 2345678901,
          change24h: 5.67,
          change7d: -1.23,
          change30d: 15.89,
          rank: 5
        },
        {
          id: 'cardano',
          symbol: 'ADA',
          name: 'Cardano',
          currentPrice: 0.485,
          marketCap: 17234567890,
          volume24h: 567890123,
          change24h: 2.34,
          change7d: -4.56,
          change30d: 6.78,
          rank: 8
        }
      ],
      trending: [
        { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', change24h: 12.45 },
        { id: 'polygon', symbol: 'MATIC', name: 'Polygon', change24h: 8.92 },
        { id: 'avalanche', symbol: 'AVAX', name: 'Avalanche', change24h: 7.34 }
      ],
      news: [
        {
          title: 'Bitcoin reaches new monthly high amid institutional adoption',
          summary: 'Major investment firms continue to allocate to cryptocurrency...',
          source: 'CryptoNews',
          timestamp: '2025-09-23T08:00:00Z',
          url: '#'
        },
        {
          title: 'Ethereum network upgrade shows promising results',
          summary: 'Transaction fees reduced by 40% following the latest update...',
          source: 'EthDaily',
          timestamp: '2025-09-23T06:30:00Z',
          url: '#'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching crypto market data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch crypto market data' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, timeframe, indicators } = body;

    // Mock custom market analysis
    const analysis = {
      symbols: symbols || ['BTC', 'ETH', 'SOL'],
      timeframe: timeframe || '24h',
      indicators: indicators || ['RSI', 'MACD', 'SMA'],
      data: symbols?.map((symbol: string) => ({
        symbol,
        rsi: Math.random() * 100,
        macd: (Math.random() - 0.5) * 10,
        sma20: Math.random() * 50000,
        recommendation: Math.random() > 0.5 ? 'BUY' : 'HOLD'
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing market analysis:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process market analysis' 
      },
      { status: 500 }
    );
  }
}
