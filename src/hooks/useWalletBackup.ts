'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: 'personal' | 'business' | 'savings';
  currency: string;
  balance: number;
  is_primary: boolean;
  status: 'active' | 'inactive' | 'frozen';
  created_at: string;
  updated_at: string;
}

export interface WalletBackup {
  id: string;
  userId: string;
  timestamp: string;
  walletCount: number;
  transactionCount: number;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface BackupOptions {
  includeTransactions?: boolean;
  walletIds?: string[];
  transactionsSince?: Date;
}

export interface RestoreOptions {
  overwriteExisting?: boolean;
  restoreTransactions?: boolean;
  walletIds?: string[];
}

export interface BackupScheduleOptions {
  schedule: 'daily' | 'weekly' | 'monthly';
  includeTransactions?: boolean;
  walletIds?: string[];
}

export interface ApiResponse<T> {
  data: T;
}

export function useWalletBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new wallet backup
   */
  const createBackup = async (options?: BackupOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.post<{ backup: WalletBackup }>('/api/wallet/backup', options || {});
      setLoading(false);
      return result.backup;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to create wallet backup';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Get all backups for the current user
   */
  const getBackups = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.get<{ backups: WalletBackup[] }>('/api/wallet/backup');
      setLoading(false);
      return result.backups;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to fetch wallet backups';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Get a specific backup
   */
  const getBackup = async (backupId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.get<{ backup: WalletBackup }>(`/api/wallet/backup/${backupId}`);
      setLoading(false);
      return result.backup;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to fetch wallet backup';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Restore from a backup
   */
  const restoreBackup = async (backupId: string, options?: RestoreOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.post<{ message: string; walletsRestored: number; transactionsRestored: number }>(
        `/api/wallet/backup/${backupId}`, 
        options || {}
      );
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to restore from backup';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Create a backup schedule
   */
  const createBackupSchedule = async (options: BackupScheduleOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.post<{ message: string }>(
        '/api/wallet/backup/schedule', 
        options
      );
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to create backup schedule';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  /**
   * Get all backup schedules for the current user
   */
  const getBackupSchedules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.get<{ schedules: any[] }>('/api/wallet/backup/schedule');
      setLoading(false);
      return result.schedules;
    } catch (err) {
      setLoading(false);
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Failed to fetch backup schedules';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  return {
    createBackup,
    getBackups,
    getBackup,
    restoreBackup,
    createBackupSchedule,
    getBackupSchedules,
    loading,
    error
  };
}
