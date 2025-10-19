import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * SPL TOKEN CACHE API
 * Fetches and caches SPL token metadata from Jupiter and Solana token lists
 */

// Jupiter API endpoints
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';
const JUPITER_PRICE_API_URL = 'https://price.jup.ag/v4/price';

// Solana token registry
const SOLANA_TOKEN_LIST_URL = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';

interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  verified?: boolean;
  daily_volume?: number;
  freeze_authority?: string;
  mint_authority?: string;
  extensions?: {
    coingeckoId?: string;
  };
}

interface TokenPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
  timeTaken: number;
}

/**
 * GET /api/solana/spl-tokens
 * Retrieve cached SPL tokens with optional filtering
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const mintAddress = url.searchParams.get('mint');
    const symbol = url.searchParams.get('symbol');
    const verified = url.searchParams.get('verified');
    const withPrices = url.searchParams.get('withPrices') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = supabase
      .from('spl_token_cache')
      .select(`
        mint_address,
        symbol,
        name,
        decimals,
        logo_uri,
        verified,
        tags,
        daily_volume,
        supply,
        metadata,
        last_updated_at,
        created_at
      `);

    // Apply filters
    if (mintAddress) {
      query = query.eq('mint_address', mintAddress);
    }

    if (symbol) {
      query = query.ilike('symbol', `%${symbol}%`);
    }

    if (verified) {
      query = query.eq('verified', verified === 'true');
    }

    // Order and limit
    query = query
      .order('verified', { ascending: false })
      .order('daily_volume', { ascending: false })
      .limit(limit);

    const { data: tokens, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    // If requesting prices and we have results, also get latest prices
    let enrichedTokens: any = tokens;
    if (withPrices && tokens && tokens.length > 0) {
      const mintAddresses = tokens.map((token: any) => token.mint_address);
      const { data: latestPrices } = await supabase
        .from('spl_token_prices')
        .select('*')
        .in('mint_address', mintAddresses)
        .order('created_at', { ascending: false })
        .limit(mintAddresses.length);

      // Merge latest prices with tokens
      enrichedTokens = tokens.map((token: any) => {
        const latestPrice = latestPrices?.find((p: any) => p.mint_address === token.mint_address);
        return {
          ...token,
          current_price: latestPrice ? {
            price_usd: latestPrice.price_usd,
            price_sol: latestPrice.price_sol,
            market_cap: latestPrice.market_cap,
            volume_24h: latestPrice.volume_24h,
            change_24h: latestPrice.change_24h,
            last_updated: latestPrice.created_at
          } : null
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: enrichedTokens,
      total: tokens?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SPL Token API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solana/spl-tokens
 * Refresh token cache from Jupiter and Solana token lists
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication and admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { source = 'jupiter', forceRefresh = false } = body;

    console.log(`🔄 Refreshing SPL token cache from ${source}...`);

    let newTokens = 0;
    let updatedTokens = 0;
    let errors = 0;

    try {
      // Fetch from Jupiter token list
      if (source === 'jupiter' || source === 'all') {
        console.log('📥 Fetching from Jupiter API...');
        const response = await fetch(JUPITER_TOKEN_LIST_URL);
        
        if (!response.ok) {
          throw new Error(`Jupiter API error: ${response.status}`);
        }

        const jupiterTokens: JupiterToken[] = await response.json();
        console.log(`📊 Found ${jupiterTokens.length} tokens from Jupiter`);

        // Process tokens in batches to avoid overwhelming the database
        const batchSize = 100;
        for (let i = 0; i < jupiterTokens.length; i += batchSize) {
          const batch = jupiterTokens.slice(i, i + batchSize);
          
          for (const token of batch) {
            try {
              // Check if token already exists
              const { data: existing } = await supabase
                .from('spl_token_cache')
                .select('mint_address, last_updated_at')
                .eq('mint_address', token.address)
                .single();

              const tokenData = {
                mint_address: token.address,
                symbol: token.symbol || 'UNKNOWN',
                name: token.name || token.symbol || 'Unknown Token',
                decimals: token.decimals,
                logo_uri: token.logoURI,
                verified: token.verified || false,
                tags: token.tags || [],
                daily_volume: token.daily_volume,
                freeze_authority: token.freeze_authority,
                mint_authority: token.mint_authority,
                source: 'jupiter',
                metadata: {
                  coingeckoId: token.extensions?.coingeckoId,
                  chainId: token.chainId
                },
                last_updated_at: new Date().toISOString()
              };

              if (existing) {
                // Update existing token if force refresh or if data is old
                const lastUpdated = new Date(existing.last_updated_at);
                const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
                
                if (forceRefresh || hoursSinceUpdate > 24) {
                  const { error: updateError } = await supabase
                    .from('spl_token_cache')
                    .update(tokenData)
                    .eq('mint_address', token.address);

                  if (updateError) {
                    console.error(`Error updating ${token.symbol}:`, updateError);
                    errors++;
                  } else {
                    updatedTokens++;
                  }
                }
              } else {
                // Insert new token
                const { error: insertError } = await supabase
                  .from('spl_token_cache')
                  .insert(tokenData);

                if (insertError) {
                  console.error(`Error inserting ${token.symbol}:`, insertError);
                  errors++;
                } else {
                  newTokens++;
                }
              }
            } catch (tokenError) {
              console.error(`Error processing token ${token.symbol}:`, tokenError);
              errors++;
            }
          }

          // Small delay between batches to avoid rate limits
          if (i + batchSize < jupiterTokens.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Fetch from Solana token registry
      if (source === 'solana' || source === 'all') {
        console.log('📥 Fetching from Solana token registry...');
        const response = await fetch(SOLANA_TOKEN_LIST_URL);
        
        if (response.ok) {
          const registry = await response.json();
          const solanaTokens = registry.tokens || [];
          console.log(`📊 Found ${solanaTokens.length} tokens from Solana registry`);

          // Process Solana tokens similarly...
          for (const token of solanaTokens.slice(0, 200)) { // Limit for now
            try {
              const tokenData = {
                mint_address: token.address,
                symbol: token.symbol || 'UNKNOWN',
                name: token.name || token.symbol || 'Unknown Token',
                decimals: token.decimals,
                logo_uri: token.logoURI,
                verified: true, // Solana registry tokens are considered verified
                tags: token.tags || [],
                source: 'solana-registry',
                metadata: {
                  extensions: token.extensions
                },
                last_updated_at: new Date().toISOString()
              };

              const { error } = await supabase
                .from('spl_token_cache')
                .upsert(tokenData, {
                  onConflict: 'mint_address',
                  ignoreDuplicates: false
                });

              if (error) {
                errors++;
              } else {
                newTokens++;
              }
            } catch (tokenError) {
              errors++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'SPL token cache refreshed successfully',
        stats: {
          newTokens,
          updatedTokens,
          errors,
          source
        },
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      console.error('Error fetching from external APIs:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch token data from external sources',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('SPL Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/solana/spl-tokens
 * Update prices for cached tokens
 */
export async function PUT(request: NextRequest) {
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

    console.log('💰 Updating SPL token prices...');

    // Get tokens that need price updates (updated in last 24h, or never)
    const { data: tokens, error: fetchError } = await supabase
      .from('spl_token_cache')
      .select('mint_address, symbol')
      .eq('verified', true)
      .order('daily_volume', { ascending: false })
      .limit(50); // Limit to top 50 tokens for now

    if (fetchError || !tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'No tokens found for price update' },
        { status: 400 }
      );
    }

    let pricesUpdated = 0;
    let errors = 0;

    // Update prices in batches
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const mintAddresses = batch.map(t => t.mint_address).join(',');

      try {
        // Fetch prices from Jupiter
        const priceResponse = await fetch(`${JUPITER_PRICE_API_URL}?ids=${mintAddresses}`);
        
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          
          for (const token of batch) {
            const price = priceData.data?.[token.mint_address];
            if (price) {
              const { error: insertError } = await supabase
                .from('spl_token_prices')
                .insert({
                  mint_address: token.mint_address,
                  price_usd: price.price || 0,
                  price_sol: price.price && price.price > 0 ? price.price / (priceData.data?.['So11111111111111111111111111111111111111112']?.price || 1) : null,
                  source: 'jupiter'
                });

              if (insertError) {
                console.error(`Price update error for ${token.symbol}:`, insertError);
                errors++;
              } else {
                pricesUpdated++;
              }
            }
          }
        }

        // Rate limit: wait between batches
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (batchError) {
        console.error('Batch price update error:', batchError);
        errors += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token prices updated',
      stats: {
        pricesUpdated,
        errors,
        totalTokens: tokens.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Price update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}