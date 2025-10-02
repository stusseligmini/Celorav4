'use client';

import { useState, useEffect } from 'react';
import { useSecureApi } from './useSecureApi';
import { useCallback } from 'react';

// Transaction types
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// Transaction model
export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  reference_id?: string;
  external_id?: string;
  merchant_name?: string;
  merchant_category?: string;
  merchant_location?: string;
  conversion_rate?: number;
  fee_amount?: number;
  fee_currency?: string;
  related_transaction_id?: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
  created_at: string;
  updated_at: string;
}

// Filter parameters for the history API
export interface WalletHistoryFilters {
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'amount' | 'type';
  order?: 'asc' | 'desc';
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: TransactionStatus;
}

// Pagination information
export interface Pagination {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// API response type
export interface WalletHistoryResponse {
  data: WalletTransaction[];
  pagination: Pagination;
}

/**
 * Hook for fetching wallet transaction history with filtering and pagination
 */
export function useWalletHistory(walletId: string, initialFilters: WalletHistoryFilters = {}) {
  // Set default filters
  const defaultFilters: WalletHistoryFilters = {
    limit: 20,
    offset: 0,
    sort: 'created_at',
    order: 'desc',
    ...initialFilters
  };
  
  // State for filters
  const [filters, setFilters] = useState<WalletHistoryFilters>(defaultFilters);
  
  // Use secure API hook for fetching data
  const {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isRetrying,
    execute,
    reset
  } = useSecureApi<WalletHistoryResponse>({
    url: `/api/wallet/${walletId}/history`,
    method: 'GET',
    initialVariables: filters,
    autoFetch: true,
    refreshInterval: 60000, // Refresh every minute
  });
  
  // Function to update filters and refetch data
  const updateFilters = useCallback((newFilters: Partial<WalletHistoryFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Reset offset when changing other filters
      if (Object.keys(newFilters).some(key => key !== 'offset' && key !== 'limit')) {
        updated.offset = 0;
      }
      
      return updated;
    });
  }, []);
  
  // Refetch when filters change
  useEffect(() => {
    execute(filters);
  }, [filters, execute]);
  
  // Helper function for pagination
  const loadNextPage = useCallback(() => {
    if (data?.pagination?.hasMore) {
      updateFilters({
        offset: (filters.offset || 0) + (filters.limit || 20)
      });
    }
  }, [data?.pagination?.hasMore, filters.offset, filters.limit, updateFilters]);
  
  const loadPreviousPage = useCallback(() => {
    if ((filters.offset || 0) > 0) {
      updateFilters({
        offset: Math.max(0, (filters.offset || 0) - (filters.limit || 20))
      });
    }
  }, [filters.offset, filters.limit, updateFilters]);
  
  // Helper to calculate current page
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = data?.pagination?.total 
    ? Math.ceil(data.pagination.total / (filters.limit || 20))
    : 0;
  
  // Helper for sorting
  const sort = useCallback((field: 'created_at' | 'amount' | 'type') => {
    updateFilters({
      sort: field,
      order: filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc'
    });
  }, [filters.sort, filters.order, updateFilters]);
  
  // Return everything needed to manage wallet history
  return {
    transactions: data?.data || [],
    pagination: data?.pagination,
    currentPage,
    totalPages,
    filters,
    updateFilters,
    loadNextPage,
    loadPreviousPage,
    sort,
    error,
    isLoading,
    isSuccess,
    isError,
    isRetrying,
    refresh: () => execute(filters),
    reset
  };
}
