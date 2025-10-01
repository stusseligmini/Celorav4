/**
 * Wallet Service for Celora V2
 * 
 * This module provides direct Supabase functions for managing wallets:
 * - Creating wallets
 * - Getting wallet information
 * - Updating wallet settings
 * - Managing wallet transactions
 * - Handling wallet funding and withdrawals
 */

import { getSupabaseClient } from './supabaseSingleton';
import { featureFlags } from './featureFlags';

export interface Wallet {
  id: string;
  user_id: string;
  wallet_name: string;
  wallet_type: string;
  balance: number;
  currency: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletParams {
  wallet_name: string;
  wallet_type?: string;
  currency?: string;
  is_primary?: boolean;
}

export interface UpdateWalletParams {
  wallet_name?: string;
  currency?: string;
  is_primary?: boolean;
}

export interface WalletTransaction {
  amount: number;
  currency: string;
  description?: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund';
  reference_id?: string;
  metadata?: Record<string, any>;
}

export class WalletService {
  /**
   * Create a new wallet for the authenticated user
   * @param params Wallet parameters
   * @returns The created wallet
   */
  static async createWallet(params: CreateWalletParams): Promise<Wallet> {
  const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Check feature flag for wallet creation
    const isNewWalletEnabled = await featureFlags.isEnabled('enable_multiple_wallets', {}, { userId: user.id });
    
    if (!isNewWalletEnabled) {
      // If multiple wallets are not enabled, check if user already has a wallet
      const { data: existingWallets, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);
      
      if (walletError) {
        throw new Error(`Failed to check existing wallets: ${walletError.message}`);
      }
      
      if (existingWallets && existingWallets.length > 0) {
        throw new Error('Multiple wallets are not enabled. You already have a wallet.');
      }
    }

    // Create new wallet
    const walletData = {
      user_id: user.id,
      wallet_name: params.wallet_name,
      wallet_type: params.wallet_type || 'default',
      currency: params.currency || 'USD',
      is_primary: params.is_primary !== undefined ? params.is_primary : true,
      balance: 0.00
    };

    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert(walletData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }

    // If this is set as primary, update all other wallets to not be primary
    if (wallet.is_primary) {
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', wallet.id);
    }

    // Create a "wallet created" notification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Wallet Created',
        message: `Your wallet "${wallet.wallet_name}" has been created successfully.`,
        type: 'wallet'
      });
      
    // Log security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'wallet_created',
        event_data: { wallet_id: wallet.id, wallet_name: wallet.wallet_name }
      });

    return wallet;
  }

  /**
   * Get a wallet by ID
   * @param walletId Wallet ID to retrieve
   * @returns The wallet information
   */
  static async getWallet(walletId: string): Promise<Wallet> {
  const supabase = getSupabaseClient();
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    if (error) {
      throw new Error(`Failed to retrieve wallet: ${error.message}`);
    }

    return wallet;
  }

  /**
   * Get all wallets for the authenticated user
   * @returns Array of wallet information
   */
  static async getUserWallets(): Promise<Wallet[]> {
    const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to retrieve wallets: ${error.message}`);
    }

    return wallets || [];
  }

  /**
   * Update wallet information
   * @param walletId Wallet ID to update
   * @param params Parameters to update
   * @returns Updated wallet information
   */
  static async updateWallet(walletId: string, params: UpdateWalletParams): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Verify wallet belongs to user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found or access denied');
    }

    // Update wallet
    const { data: updatedWallet, error } = await supabase
      .from('wallets')
      .update({
        wallet_name: params.wallet_name !== undefined ? params.wallet_name : wallet.wallet_name,
        currency: params.currency !== undefined ? params.currency : wallet.currency,
        is_primary: params.is_primary !== undefined ? params.is_primary : wallet.is_primary
      })
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update wallet: ${error.message}`);
    }

    // If this is set as primary, update all other wallets to not be primary
    if (params.is_primary) {
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', walletId);
    }

    return updatedWallet;
  }

  /**
   * Delete a wallet
   * @param walletId Wallet ID to delete
   * @returns True if successful
   */
  static async deleteWallet(walletId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Verify wallet belongs to user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found or access denied');
    }

    // Check if this is the primary wallet
    if (wallet.is_primary) {
      throw new Error('Cannot delete the primary wallet');
    }

    // Check if the wallet has a balance
    if (wallet.balance > 0) {
      throw new Error('Cannot delete a wallet with a balance');
    }

    // Delete the wallet
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId);

    if (error) {
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }

    // Create notification and log event
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Wallet Deleted',
        message: `Your wallet "${wallet.wallet_name}" has been deleted.`,
        type: 'wallet'
      });
      
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'wallet_deleted',
        event_data: { wallet_id: wallet.id, wallet_name: wallet.wallet_name }
      });

    return true;
  }

  /**
   * Process a transaction for a wallet
   * @param walletId Wallet ID
   * @param transaction Transaction details
   * @returns Updated wallet and transaction ID
   */
  static async processTransaction(
    walletId: string, 
    transaction: WalletTransaction
  ): Promise<{ wallet: Wallet, transactionId: string }> {
    const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Start a Postgres transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    
    if (transactionError) {
      throw new Error(`Failed to start transaction: ${transactionError.message}`);
    }

    try {
      // Verify wallet belongs to user
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .eq('user_id', user.id)
        .single();

      if (walletError || !wallet) {
        throw new Error('Wallet not found or access denied');
      }

      // Check if transaction is valid
      if (transaction.amount <= 0) {
        throw new Error('Transaction amount must be greater than 0');
      }

      // For withdrawals, payments, or transfers, check if there's enough balance
      if (['withdrawal', 'payment', 'transfer'].includes(transaction.transaction_type) 
          && wallet.balance < transaction.amount) {
        throw new Error('Insufficient balance for this transaction');
      }

      // Calculate new balance
      let newBalance = wallet.balance;
      if (['deposit', 'refund'].includes(transaction.transaction_type)) {
        newBalance += transaction.amount;
      } else if (['withdrawal', 'payment', 'transfer'].includes(transaction.transaction_type)) {
        newBalance -= transaction.amount;
      }

      // Create transaction record
      const { data: transactionRecord, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: walletId,
          transaction_type: transaction.transaction_type,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          reference_id: transaction.reference_id,
          status: 'completed',
          metadata: transaction.metadata
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create transaction record: ${insertError.message}`);
      }

      // Update wallet balance
      const { data: updatedWallet, error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', walletId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update wallet balance: ${updateError.message}`);
      }

      // Commit the transaction
      await supabase.rpc('commit_transaction');

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: `${transaction.transaction_type.charAt(0).toUpperCase()}${transaction.transaction_type.slice(1)} Processed`,
          message: `${transaction.amount} ${transaction.currency} has been ${
            ['deposit', 'refund'].includes(transaction.transaction_type) ? 'added to' : 'deducted from'
          } your wallet.`,
          type: 'transaction'
        });

      return { 
        wallet: updatedWallet, 
        transactionId: transactionRecord.id 
      };
    } catch (error: any) {
      // Rollback on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet
   * @param walletId Wallet ID
   * @param limit Number of transactions to return (default 10)
   * @param offset Offset for pagination (default 0)
   * @returns Array of transactions
   */
  static async getTransactionHistory(
    walletId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<any[]> {
    const supabase = getSupabaseClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Verify wallet belongs to user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found or access denied');
    }

    // Get transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id, 
        transaction_type, 
        amount, 
        currency, 
        status, 
        description, 
        merchant_name, 
        created_at, 
        reference_id, 
        metadata
      `)
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to retrieve transaction history: ${error.message}`);
    }

    return transactions || [];
  }
}