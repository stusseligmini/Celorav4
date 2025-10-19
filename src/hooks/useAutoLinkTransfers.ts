import { useState, useEffect, useCallback } from 'react';

export interface PendingTransferLink {
  id: string;
  signature: string;
  wallet_address: string;
  amount: number;
  token_mint?: string;
  transfer_type: 'incoming' | 'outgoing';
  confidence_score: number;
  auto_link_status: 'pending' | 'linked' | 'ignored' | 'manual_review';
  linked_user_id?: string;
  linked_wallet_id?: string;
  linked_transaction_id?: string;
  time_window_hours: number;
  attempts: number;
  expires_at: string;
  created_at: string;
}

export interface AutoLinkSettings {
  id: string;
  user_id: string;
  wallet_id: string;
  enabled: boolean;
  min_confidence_score: number;
  time_window_hours: number;
  notification_enabled: boolean;
  auto_confirm_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoLinkData {
  settings: AutoLinkSettings[];
  pending_transfers: PendingTransferLink[];
  auto_link_transfers: any[];
  wallets: any[];
}

export interface ProcessingStats {
  processedLinks: number;
  linkedTransactions: number;
  errors: number;
  successRate: string;
}

/**
 * Hook for managing auto-link transfer system
 */
export const useAutoLinkTransfers = () => {
  const [autoLinkData, setAutoLinkData] = useState<AutoLinkData>({
    settings: [],
    pending_transfers: [],
    auto_link_transfers: [],
    wallets: []
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load auto-link data for current user
   */
  const loadAutoLinkData = useCallback(async (walletId?: string, status?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (walletId) params.set('wallet_id', walletId);
      if (status) params.set('status', status);

      const response = await fetch(`/api/solana/auto-link?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAutoLinkData(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to load auto-link data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Auto-link data load error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update auto-link settings for a wallet
   */
  const updateSettings = useCallback(async (settings: {
    wallet_id: string;
    enabled?: boolean;
    min_confidence_score?: number;
    time_window_hours?: number;
    notification_enabled?: boolean;
    auto_confirm_enabled?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/auto-link', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Reload data to reflect changes
        await loadAutoLinkData();
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Settings update error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadAutoLinkData]);

  /**
   * Process pending transfer links
   */
  const processPendingLinks = useCallback(async (options?: {
    force_process?: boolean;
    signature?: string;
  }) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/solana/auto-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_pending',
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Processing completed:', result.stats);
        
        // Reload data to show updated status
        await loadAutoLinkData();
        
        return {
          stats: result.stats as ProcessingStats,
          results: result.results
        };
      } else {
        throw new Error(result.error || 'Failed to process pending links');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Processing error:', err);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [loadAutoLinkData]);

  /**
   * Get settings for a specific wallet
   */
  const getWalletSettings = useCallback((walletId: string): AutoLinkSettings | null => {
    return autoLinkData.settings.find(s => s.wallet_id === walletId) || null;
  }, [autoLinkData.settings]);

  /**
   * Get pending transfers for a specific wallet
   */
  const getWalletPendingTransfers = useCallback((walletAddress: string) => {
    return autoLinkData.pending_transfers.filter(t => t.wallet_address === walletAddress);
  }, [autoLinkData.pending_transfers]);

  /**
   * Get statistics for auto-link performance
   */
  const getAutoLinkStats = useCallback(() => {
    const totalPending = autoLinkData.pending_transfers.length;
    const pendingByStatus = autoLinkData.pending_transfers.reduce((acc, transfer) => {
      acc[transfer.auto_link_status] = (acc[transfer.auto_link_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentLinksCount = autoLinkData.auto_link_transfers.length;
    const avgConfidence = autoLinkData.auto_link_transfers.length > 0 
      ? autoLinkData.auto_link_transfers.reduce((sum, link) => sum + (link.confidence_score || 0), 0) / autoLinkData.auto_link_transfers.length
      : 0;

    return {
      totalPending,
      pendingByStatus,
      recentLinksCount,
      avgConfidence: avgConfidence.toFixed(2),
      enabledWallets: autoLinkData.settings.filter(s => s.enabled).length,
      totalWallets: autoLinkData.wallets.length
    };
  }, [autoLinkData]);

  // Load initial data on mount
  useEffect(() => {
    loadAutoLinkData();
  }, [loadAutoLinkData]);

  return {
    autoLinkData,
    loading,
    processing,
    error,
    loadAutoLinkData,
    updateSettings,
    processPendingLinks,
    getWalletSettings,
    getWalletPendingTransfers,
    getAutoLinkStats,
    clearError: () => setError(null)
  };
};

/**
 * Hook for managing auto-link settings for a specific wallet
 */
export const useWalletAutoLink = (walletId: string | null) => {
  const [settings, setSettings] = useState<AutoLinkSettings | null>(null);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransferLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    autoLinkData, 
    updateSettings, 
    getWalletSettings, 
    getWalletPendingTransfers,
    loadAutoLinkData
  } = useAutoLinkTransfers();

  // Update local state when wallet or auto-link data changes
  useEffect(() => {
    if (walletId) {
      const walletSettings = getWalletSettings(walletId);
      setSettings(walletSettings);

      // Find wallet by ID to get address
      const wallet = autoLinkData.wallets.find(w => w.id === walletId);
      if (wallet) {
        const transfers = getWalletPendingTransfers(wallet.public_key);
        setPendingTransfers(transfers);
      }
    } else {
      setSettings(null);
      setPendingTransfers([]);
    }
  }, [walletId, autoLinkData, getWalletSettings, getWalletPendingTransfers]);

  /**
   * Enable or disable auto-linking for this wallet
   */
  const toggleAutoLink = useCallback(async (enabled: boolean) => {
    if (!walletId) return false;

    setLoading(true);
    try {
      const result = await updateSettings({
        wallet_id: walletId,
        enabled
      });
      return !!result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle auto-link');
      return false;
    } finally {
      setLoading(false);
    }
  }, [walletId, updateSettings]);

  /**
   * Update confidence threshold
   */
  const updateConfidenceThreshold = useCallback(async (minConfidence: number) => {
    if (!walletId) return false;

    setLoading(true);
    try {
      const result = await updateSettings({
        wallet_id: walletId,
        min_confidence_score: minConfidence
      });
      return !!result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update confidence threshold');
      return false;
    } finally {
      setLoading(false);
    }
  }, [walletId, updateSettings]);

  /**
   * Update time window for matching
   */
  const updateTimeWindow = useCallback(async (hours: number) => {
    if (!walletId) return false;

    setLoading(true);
    try {
      const result = await updateSettings({
        wallet_id: walletId,
        time_window_hours: hours
      });
      return !!result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time window');
      return false;
    } finally {
      setLoading(false);
    }
  }, [walletId, updateSettings]);

  return {
    settings,
    pendingTransfers,
    loading,
    error,
    toggleAutoLink,
    updateConfidenceThreshold,
    updateTimeWindow,
    refreshData: () => loadAutoLinkData(),
    clearError: () => setError(null)
  };
};

/**
 * Utility functions for auto-link system
 */
export const autoLinkUtils = {
  /**
   * Format confidence score as percentage
   */
  formatConfidence: (score: number): string => {
    return `${(score * 100).toFixed(1)}%`;
  },

  /**
   * Get status color for UI
   */
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'linked': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'manual_review': return 'text-blue-600';
      case 'ignored': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  },

  /**
   * Get status icon for UI
   */
  getStatusIcon: (status: string): string => {
    switch (status) {
      case 'linked': return '✅';
      case 'pending': return '⏳';
      case 'manual_review': return '🔍';
      case 'ignored': return '❌';
      default: return '❓';
    }
  },

  /**
   * Format transfer type
   */
  formatTransferType: (type: string): string => {
    return type === 'incoming' ? '📥 Incoming' : '📤 Outgoing';
  },

  /**
   * Check if transfer is expired
   */
  isExpired: (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  },

  /**
   * Get time remaining until expiry
   */
  getTimeRemaining: (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
};