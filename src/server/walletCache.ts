// server/walletCache.ts - A server-side cache for wallet data
import { WalletService } from '@/lib/services/walletService';

// Cache expiration time in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

type CacheEntry = {
  data: any;
  timestamp: number;
};

class WalletCache {
  private static instance: WalletCache;
  private cache: Record<string, CacheEntry> = {};
  
  private constructor() {}
  
  public static getInstance(): WalletCache {
    if (!WalletCache.instance) {
      WalletCache.instance = new WalletCache();
    }
    return WalletCache.instance;
  }
  
  public async getTransactionHistory(walletId: string, limit: number, offset: number): Promise<any[]> {
    const cacheKey = `transactions_${walletId}_${limit}_${offset}`;
    
    // Check if data is in cache and not expired
    if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp) < CACHE_TTL) {
      return this.cache[cacheKey].data;
    }
    
    // Get data from service
    try {
      const result = await WalletService.getTransactionHistory({ walletId, limit, offset });
      
      // Cache the result
      this.cache[cacheKey] = {
        data: result.transactions,
        timestamp: Date.now()
      };
      
      return result.transactions;
    } catch (error) {
      console.error(`Error fetching transaction history for wallet ${walletId}:`, error);
      // Return empty array on error
      return [];
    }
  }
  
  public clearCache(walletId?: string): void {
    if (walletId) {
      // Clear cache for specific wallet
      const keyPrefix = `transactions_${walletId}`;
      Object.keys(this.cache)
        .filter(key => key.startsWith(keyPrefix))
        .forEach(key => delete this.cache[key]);
    } else {
      // Clear entire cache
      this.cache = {};
    }
  }
}

export const walletCache = WalletCache.getInstance();
