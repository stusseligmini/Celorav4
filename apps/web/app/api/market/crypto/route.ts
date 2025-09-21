import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Mock crypto API (in production, use CoinGecko, CoinMarketCap, etc.)
const CRYPTO_PRICES = {
  bitcoin: { price: 43250.00, change_24h: 2.34 },
  ethereum: { price: 2580.50, change_24h: -1.23 },
  solana: { price: 98.75, change_24h: 5.67 },
  cardano: { price: 0.45, change_24h: -0.89 },
  polygon: { price: 0.85, change_24h: 3.21 }
};

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update market data in database
    const marketUpdates = Object.entries(CRYPTO_PRICES).map(([symbol, data]) => ({
      symbol: symbol.toUpperCase(),
      price: data.price,
      change_24h: data.change_24h,
      volume_24h: Math.random() * 1000000000, // Mock volume
      market_cap: data.price * (Math.random() * 21000000), // Mock market cap
      last_updated: new Date().toISOString()
    }));

    // Batch insert/update market data
    const { error: marketError } = await supabase
      .from('market_data')
      .upsert(marketUpdates, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      });

    if (marketError) {
      console.error('Market data update error:', marketError);
    }

    // Get updated market data
    const { data: marketData, error } = await supabase
      .from('market_data')
      .select('*')
      .order('symbol');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Crypto market API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Invalid symbols array' }, { status: 400 });
    }

    // Get specific crypto prices
    const { data: marketData, error } = await supabase
      .from('market_data')
      .select('*')
      .in('symbol', symbols.map(s => s.toUpperCase()));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Crypto market POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}