import { useState, useEffect, useCallback } from 'react';

export interface SPLToken {
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

export interface SPLTokenCacheResponse {
  success: boolean;
  data: SPLToken[];
  total: number;
  timestamp: string;
}

export interface SPLTokenLookupResponse {
  success: boolean;
  data: SPLToken;
  cached: boolean;
  last_updated?: string;
  timestamp: string;
}

/**
 * Hook for managing SPL token cache
 */
export const useSPLTokenCache = () => {
  const [tokens, setTokens] = useState<SPLToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for tokens in cache
   */
  const searchTokens = useCallback(async (params?: {
    symbol?: string;
    verified?: boolean;
    withPrices?: boolean;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.symbol) searchParams.set('symbol', params.symbol);
      if (params?.verified !== undefined) searchParams.set('verified', params.verified.toString());
      if (params?.withPrices) searchParams.set('withPrices', 'true');
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/solana/spl-tokens?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SPLTokenCacheResponse = await response.json();
      
      if (data.success) {
        setTokens(data.data);
        return data.data;
      } else {
        throw new Error('Failed to fetch tokens');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Token search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get specific token by mint address
   */
  const getToken = useCallback(async (mintAddress: string): Promise<SPLToken | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/solana/token/${mintAddress}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Token not found
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SPLTokenLookupResponse = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error('Failed to fetch token');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Token lookup error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh token cache from external sources
   */
  const refreshCache = useCallback(async (source: 'jupiter' | 'solana' | 'all' = 'jupiter', forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/spl-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source,
          forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Token cache refreshed:', data.stats);
        return data.stats;
      } else {
        throw new Error(data.error || 'Failed to refresh cache');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Cache refresh error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update token prices
   */
  const updatePrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/spl-tokens', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('💰 Token prices updated:', data.stats);
        return data.stats;
      } else {
        throw new Error(data.error || 'Failed to update prices');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Price update error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tokens,
    loading,
    error,
    searchTokens,
    getToken,
    refreshCache,
    updatePrices,
    clearError: () => setError(null)
  };
};

/**
 * Hook for getting a specific token (with caching)
 */
export const useSPLToken = (mintAddress: string | null) => {
  const [token, setToken] = useState<SPLToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useSPLTokenCache();

  useEffect(() => {
    if (!mintAddress) {
      setToken(null);
      return;
    }

    const fetchToken = async () => {
      setLoading(true);
      try {
        const tokenData = await getToken(mintAddress);
        setToken(tokenData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch token');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [mintAddress, getToken]);

  return {
    token,
    loading,
    error,
    refetch: () => {
      if (mintAddress) {
        getToken(mintAddress).then(setToken);
      }
    }
  };
};

/**
 * Utility function to format token amounts
 */
export const formatTokenAmount = (amount: number | string, decimals: number, maxDecimals = 6): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const divisor = Math.pow(10, decimals);
  const formatted = num / divisor;
  
  if (formatted === 0) return '0';
  if (formatted < 0.000001) return '<0.000001';
  
  return formatted.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(maxDecimals, decimals)
  });
};

/**
 * Utility function to get token display info
 */
export const getTokenDisplayInfo = (token: SPLToken | null) => {
  if (!token) return null;

  return {
    symbol: token.symbol,
    name: token.name,
    logo: token.logo_uri,
    verified: token.verified,
    decimals: token.decimals,
    price: token.current_price?.price_usd,
    change24h: token.current_price?.change_24h,
    isPositiveChange: token.current_price?.change_24h ? token.current_price.change_24h > 0 : null
  };
};