import { getSupabaseClient } from '../supabaseSingleton';
import { WalletService, Wallet, WalletTransaction, TransactionHistoryParams } from './walletService';
import { v4 as uuidv4 } from 'uuid';

// Encryption utilities would normally be imported from a secure module
// This is a simplified example - in a production environment, use a proper encryption library
const encryptData = (data: any, key: string): string => {
  // In a real implementation, this would use a secure encryption algorithm
  // For demonstration purposes only - NOT secure:
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

const decryptData = (encryptedData: string, key: string): any => {
  // In a real implementation, this would use the corresponding decryption algorithm
  // For demonstration purposes only - NOT secure:
  return JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf-8'));
};

export interface BackupOptions {
  includeTransactions?: boolean;
  walletIds?: string[];
  transactionsSince?: Date;
  encryptionKey?: string;
}

export interface WalletBackup {
  id: string;
  userId: string;
  timestamp: string;
  encryptedData: string;
  walletCount: number;
  transactionCount: number;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface BackupData {
  wallets: Wallet[];
  transactions?: WalletTransaction[];
  metadata: {
    createdAt: string;
    userId: string;
    version: string;
  };
}

export interface RestoreOptions {
  overwriteExisting?: boolean;
  restoreTransactions?: boolean;
  walletIds?: string[];
  encryptionKey?: string;
}

/**
 * Service for wallet backup and recovery operations
 */
export class WalletBackupService {
  /**
   * Create a backup of user wallets
   */
  static async createBackup(
    userId: string,
    options: BackupOptions = {}
  ): Promise<WalletBackup> {
    const supabase = getSupabaseClient();
    const encryptionKey = options.encryptionKey || process.env.WALLET_ENCRYPTION_KEY || 'default-key';
    
    try {
      // Get all user wallets or specified wallets
      let wallets: Wallet[];
      if (options.walletIds && options.walletIds.length > 0) {
        wallets = [];
        for (const id of options.walletIds) {
          const wallet = await WalletService.getWallet(id);
          if (wallet) wallets.push(wallet);
        }
      } else {
        wallets = await WalletService.getUserWallets(userId);
      }
      
      // Get transactions if requested
      let transactions: WalletTransaction[] = [];
      if (options.includeTransactions) {
        const walletIds = wallets.map(w => w.id);
        
        for (const walletId of walletIds) {
          // Get transactions for each wallet with potential date filter
          const historyParams: TransactionHistoryParams = {
            walletId,
            limit: 1000, // Get a large number of transactions
          };
          
          if (options.transactionsSince) {
            historyParams.startDate = options.transactionsSince.toISOString();
          }
          
          const { transactions: walletTransactions } = await WalletService.getTransactionHistory(historyParams);
          transactions = [...transactions, ...walletTransactions];
        }
      }
      
      // Create backup data object
      const backupData: BackupData = {
        wallets,
        transactions: options.includeTransactions ? transactions : undefined,
        metadata: {
          createdAt: new Date().toISOString(),
          userId,
          version: '1.0'
        }
      };
      
      // Encrypt the backup data
      const encryptedData = encryptData(backupData, encryptionKey);
      
      // Calculate checksum (in a real implementation, use a secure hashing algorithm)
      const checksum = Buffer.from(JSON.stringify(backupData)).toString('base64').slice(0, 32);
      
      // Create backup record
      const backupId = uuidv4();
      const backup: WalletBackup = {
        id: backupId,
        userId,
        timestamp: new Date().toISOString(),
        encryptedData,
        walletCount: wallets.length,
        transactionCount: transactions.length,
        size: encryptedData.length,
        checksum,
        metadata: {
          includesTransactions: options.includeTransactions || false,
          transactionsSince: options.transactionsSince?.toISOString(),
          specificWallets: options.walletIds?.length ? true : false
        }
      };
      
      // Store backup in the database
      const { error } = await supabase
        .from('wallet_backups')
        .insert(backup);
      
      if (error) {
        throw new Error(`Failed to store wallet backup: ${error.message}`);
      }
      
      return backup;
    } catch (error) {
      console.error('Error creating wallet backup:', error);
      throw error;
    }
  }
  
  /**
   * Get a list of backups for a user
   */
  static async getBackups(userId: string): Promise<WalletBackup[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallet_backups')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to retrieve wallet backups: ${error.message}`);
    }
    
    return data as WalletBackup[];
  }
  
  /**
   * Get a specific backup
   */
  static async getBackup(backupId: string): Promise<WalletBackup> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallet_backups')
      .select('*')
      .eq('id', backupId)
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to retrieve wallet backup: ${error?.message || 'Backup not found'}`);
    }
    
    return data as WalletBackup;
  }
  
  /**
   * Restore wallets from a backup
   */
  static async restoreFromBackup(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<{ walletsRestored: number; transactionsRestored: number }> {
    const supabase = getSupabaseClient();
    const encryptionKey = options.encryptionKey || process.env.WALLET_ENCRYPTION_KEY || 'default-key';
    
    try {
      // Get the backup
      const backup = await this.getBackup(backupId);
      
      // Decrypt the backup data
      const backupData = decryptData(backup.encryptedData, encryptionKey) as BackupData;
      
      // Filter wallets if specific IDs are requested
      let walletsToRestore = backupData.wallets;
      if (options.walletIds && options.walletIds.length > 0) {
        walletsToRestore = walletsToRestore.filter(w => options.walletIds!.includes(w.id));
      }
      
      // Start a transaction
      const { error: txError } = await supabase.rpc('begin_transaction');
      if (txError) {
        throw new Error(`Failed to start transaction: ${txError.message}`);
      }
      
      try {
        // Restore wallets
        let walletsRestored = 0;
        let transactionsRestored = 0;
        
        for (const wallet of walletsToRestore) {
          // Check if wallet exists if we're not overwriting
          if (!options.overwriteExisting) {
            const existingWallet = await WalletService.getWallet(wallet.id);
            if (existingWallet) {
              console.log(`Skipping existing wallet: ${wallet.id}`);
              continue;
            }
          }
          
          // Insert or update the wallet
          const { error } = await supabase
            .from('wallets')
            .upsert({
              id: wallet.id,
              user_id: wallet.user_id,
              name: wallet.name,
              type: wallet.type,
              currency: wallet.currency,
              balance: wallet.balance,
              is_primary: wallet.is_primary,
              status: wallet.status,
              created_at: wallet.created_at,
              updated_at: new Date().toISOString(),
            });
          
          if (error) {
            throw new Error(`Failed to restore wallet ${wallet.id}: ${error.message}`);
          }
          
          walletsRestored++;
        }
        
        // Restore transactions if requested
        if (options.restoreTransactions && backupData.transactions) {
          const walletIds = walletsToRestore.map(w => w.id);
          
          for (const transaction of backupData.transactions) {
            // Only restore transactions for the selected wallets
            if (!walletIds.includes(transaction.wallet_id)) {
              continue;
            }
            
            // Insert the transaction
            const { error } = await supabase
              .from('wallet_transactions')
              .insert({
                id: transaction.id,
                wallet_id: transaction.wallet_id,
                amount: transaction.amount,
                currency: transaction.currency,
                type: transaction.type,
                status: transaction.status,
                description: transaction.description,
                metadata: transaction.metadata,
                reference_id: transaction.reference_id,
                external_id: transaction.external_id,
                merchant_name: transaction.merchant_name,
                merchant_category: transaction.merchant_category,
                merchant_location: transaction.merchant_location,
                conversion_rate: transaction.conversion_rate,
                fee_amount: transaction.fee_amount,
                fee_currency: transaction.fee_currency,
                related_transaction_id: transaction.related_transaction_id,
                source_wallet_id: transaction.source_wallet_id,
                destination_wallet_id: transaction.destination_wallet_id,
                created_at: transaction.created_at,
                updated_at: transaction.updated_at,
              });
            
            if (error) {
              console.warn(`Failed to restore transaction ${transaction.id}: ${error.message}`);
              continue;
            }
            
            transactionsRestored++;
          }
        }
        
        // Commit the transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) {
          throw new Error(`Failed to commit transaction: ${commitError.message}`);
        }
        
        return { walletsRestored, transactionsRestored };
      } catch (error) {
        // Rollback the transaction
        await supabase.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
  
  /**
   * Schedule a recurring backup
   */
  static async scheduleRecurringBackup(
    userId: string,
    schedule: 'daily' | 'weekly' | 'monthly',
    options: BackupOptions = {}
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    // Create a schedule record
    const { error } = await supabase
      .from('wallet_backup_schedules')
      .insert({
        user_id: userId,
        schedule,
        options,
        last_run: null,
        next_run: this.calculateNextRun(schedule),
        is_active: true
      });
    
    if (error) {
      throw new Error(`Failed to schedule backup: ${error.message}`);
    }
  }
  
  /**
   * Calculate the next run time for a backup schedule
   */
  private static calculateNextRun(schedule: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (schedule) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(2, 0, 0, 0); // 2 AM
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + (7 - now.getDay()));
        nextRun.setHours(2, 0, 0, 0); // 2 AM
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(2, 0, 0, 0); // 2 AM
        break;
    }
    
    return nextRun.toISOString();
  }
}
