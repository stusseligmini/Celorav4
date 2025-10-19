import { useState, useEffect, useCallback } from 'react';

export interface WebSocketSubscription {
  id: string;
  user_id: string;
  wallet_address: string;
  subscription_type: 'account' | 'program' | 'logs' | 'signature';
  is_active: boolean;
  last_notification_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SolanaTransaction {
  id: string;
  signature: string;
  wallet_address: string;
  block_time?: number;
  slot?: number;
  transaction_type: string;
  amount?: number;
  token_mint?: string;
  token_amount?: number;
  from_address?: string;
  to_address?: string;
  fee?: number;
  success: boolean;
  error_message?: string;
  processed_at: string;
  created_at: string;
}

export interface WebSocketStreamData {
  subscriptions: WebSocketSubscription[];
  recent_transactions: SolanaTransaction[];
  wallet_count: number;
}

/**
 * Hook for managing Solana WebSocket streaming subscriptions
 */
export const useSolanaWebSocket = () => {
  const [streamData, setStreamData] = useState<WebSocketStreamData>({
    subscriptions: [],
    recent_transactions: [],
    wallet_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Subscribe to a Solana wallet for real-time monitoring
   */
  const subscribeToWallet = useCallback(async (
    walletAddress: string, 
    subscriptionType: 'account' | 'logs' | 'signature' = 'account'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'subscribe',
          wallet_address: walletAddress,
          subscription_type: subscriptionType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Subscribed to ${subscriptionType} for ${walletAddress}`);
        // Refresh subscriptions list
        await refreshSubscriptions();
        return true;
      } else {
        throw new Error(data.error || 'Failed to subscribe');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Subscribe error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unsubscribe from a Solana wallet
   */
  const unsubscribeFromWallet = useCallback(async (
    walletAddress: string,
    subscriptionType: 'account' | 'logs' | 'signature' = 'account'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'unsubscribe',
          wallet_address: walletAddress,
          subscription_type: subscriptionType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Unsubscribed from ${subscriptionType} for ${walletAddress}`);
        // Refresh subscriptions list
        await refreshSubscriptions();
        return true;
      } else {
        throw new Error(data.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Unsubscribe error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get subscription status for a specific wallet
   */
  const getSubscriptionStatus = useCallback(async (walletAddress?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (walletAddress) {
        params.set('wallet_address', walletAddress);
      }

      const response = await fetch(`/api/solana/websocket?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStreamData(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Status fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh subscriptions and transaction data
   */
  const refreshSubscriptions = useCallback(async () => {
    return await getSubscriptionStatus();
  }, [getSubscriptionStatus]);

  /**
   * Check if a wallet is subscribed
   */
  const isWalletSubscribed = useCallback((walletAddress: string, subscriptionType: string = 'account') => {
    return streamData.subscriptions.some(sub => 
      sub.wallet_address === walletAddress && 
      sub.subscription_type === subscriptionType && 
      sub.is_active
    );
  }, [streamData.subscriptions]);

  /**
   * Get recent transactions for a specific wallet
   */
  const getWalletTransactions = useCallback((walletAddress: string) => {
    return streamData.recent_transactions.filter(tx => 
      tx.wallet_address === walletAddress ||
      tx.from_address === walletAddress ||
      tx.to_address === walletAddress
    );
  }, [streamData.recent_transactions]);

  // Load initial data on mount
  useEffect(() => {
    refreshSubscriptions();
  }, [refreshSubscriptions]);

  return {
    streamData,
    loading,
    error,
    subscribeToWallet,
    unsubscribeFromWallet,
    refreshSubscriptions,
    isWalletSubscribed,
    getWalletTransactions,
    clearError: () => setError(null)
  };
};

/**
 * Hook for monitoring a specific wallet with automatic subscription management
 */
export const useSolanaWalletMonitor = (
  walletAddress: string | null,
  autoSubscribe: boolean = true,
  subscriptionType: 'account' | 'logs' | 'signature' = 'account'
) => {
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { 
    subscribeToWallet, 
    unsubscribeFromWallet, 
    isWalletSubscribed, 
    getWalletTransactions,
    streamData,
    loading,
    error 
  } = useSolanaWebSocket();

  // Subscribe/unsubscribe when wallet address changes
  useEffect(() => {
    if (!walletAddress) {
      setIsSubscribed(false);
      setTransactions([]);
      return;
    }

    const subscribed = isWalletSubscribed(walletAddress, subscriptionType);
    setIsSubscribed(subscribed);

    if (autoSubscribe && !subscribed) {
      subscribeToWallet(walletAddress, subscriptionType);
    }
  }, [walletAddress, autoSubscribe, subscriptionType, isWalletSubscribed, subscribeToWallet]);

  // Update transactions when stream data changes
  useEffect(() => {
    if (walletAddress) {
      const walletTxs = getWalletTransactions(walletAddress);
      setTransactions(walletTxs);
    }
  }, [walletAddress, streamData.recent_transactions, getWalletTransactions]);

  const subscribe = useCallback(async () => {
    if (walletAddress) {
      const success = await subscribeToWallet(walletAddress, subscriptionType);
      if (success) {
        setIsSubscribed(true);
      }
      return success;
    }
    return false;
  }, [walletAddress, subscriptionType, subscribeToWallet]);

  const unsubscribe = useCallback(async () => {
    if (walletAddress) {
      const success = await unsubscribeFromWallet(walletAddress, subscriptionType);
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    }
    return false;
  }, [walletAddress, subscriptionType, unsubscribeFromWallet]);

  return {
    transactions,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    walletAddress
  };
};