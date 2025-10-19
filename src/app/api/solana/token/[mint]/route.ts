import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * SPL TOKEN LOOKUP API
 * /api/solana/token/[mint]
 * Get specific SPL token info by mint address
 */

interface TokenInfo {
  mint_address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo_uri?: string;
  verified: boolean;
  tags?: string[];
  daily_volume?: number;
  supply?: string;
  metadata?: any;
  current_price?: {
    price_usd: number;
    price_sol?: number;
    market_cap?: number;
    volume_24h?: number;
    change_24h?: number;
    last_updated: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const mintAddress = params.mint;
    
    if (!mintAddress) {
      return NextResponse.json(
        { error: 'Mint address is required' },
        { status: 400 }
      );
    }

    // Get token info from cache
    const { data: tokenData, error: tokenError } = await supabase
      .from('spl_token_cache')
      .select('*')
      .eq('mint_address', mintAddress)
      .single();

    if (tokenError || !tokenData) {
      // Try to fetch from Jupiter API if not in cache
      try {
        console.log(`🔍 Token ${mintAddress} not in cache, fetching from Jupiter...`);
        
        const jupiterResponse = await fetch(`https://token.jup.ag/strict`);
        if (jupiterResponse.ok) {
          const allTokens = await jupiterResponse.json();
          const token = allTokens.find((t: any) => t.address === mintAddress);
          
          if (token) {
            // Cache the token for future use
            const tokenData = {
              mint_address: token.address,
              symbol: token.symbol || 'UNKNOWN',
              name: token.name || token.symbol || 'Unknown Token',
              decimals: token.decimals,
              logo_uri: token.logoURI,
              verified: token.verified || false,
              tags: token.tags || [],
              daily_volume: token.daily_volume,
              source: 'jupiter',
              metadata: {
                coingeckoId: token.extensions?.coingeckoId,
                chainId: token.chainId
              },
              last_updated_at: new Date().toISOString()
            };

            // Insert into cache
            await supabase
              .from('spl_token_cache')
              .insert(tokenData);

            const response: TokenInfo = {
              mint_address: tokenData.mint_address,
              symbol: tokenData.symbol,
              name: tokenData.name,
              decimals: tokenData.decimals,
              logo_uri: tokenData.logo_uri,
              verified: tokenData.verified,
              tags: tokenData.tags,
              daily_volume: tokenData.daily_volume,
              metadata: tokenData.metadata
            };

            return NextResponse.json({
              success: true,
              data: response,
              cached: false,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (fetchError) {
        console.error('Error fetching from Jupiter:', fetchError);
      }

      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Get latest price data
    const { data: priceData } = await supabase
      .from('spl_token_prices')
      .select('*')
      .eq('mint_address', mintAddress)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const response: TokenInfo = {
      mint_address: tokenData.mint_address,
      symbol: tokenData.symbol,
      name: tokenData.name,
      decimals: tokenData.decimals,
      logo_uri: tokenData.logo_uri,
      verified: tokenData.verified,
      tags: tokenData.tags,
      daily_volume: tokenData.daily_volume,
      supply: tokenData.supply,
      metadata: tokenData.metadata,
      current_price: priceData ? {
        price_usd: parseFloat(priceData.price_usd),
        price_sol: priceData.price_sol ? parseFloat(priceData.price_sol) : undefined,
        market_cap: priceData.market_cap ? parseFloat(priceData.market_cap) : undefined,
        volume_24h: priceData.volume_24h ? parseFloat(priceData.volume_24h) : undefined,
        change_24h: priceData.change_24h ? parseFloat(priceData.change_24h) : undefined,
        last_updated: priceData.created_at
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: response,
      cached: true,
      last_updated: tokenData.last_updated_at,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}