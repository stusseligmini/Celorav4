import { getSupabaseClient } from '../supabaseSingleton';
import { v4 as uuidv4 } from 'uuid';

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

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'adjustment';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
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

export interface CreateWalletParams {
  userId: string;
  name: string;
  type: 'personal' | 'business' | 'savings';
  currency: string;
  isPrimary?: boolean;
}

export interface CreateTransactionParams {
  walletId: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'adjustment';
  description?: string;
  metadata?: Record<string, any>;
  referenceId?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantLocation?: string;
  feeAmount?: number;
  feeCurrency?: string;
  sourceWalletId?: string;
  destinationWalletId?: string;
  related_transaction_id?: string;
}

export interface TransactionHistoryParams {
  walletId: string;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'amount' | 'type';
  order?: 'asc' | 'desc';
  type?: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'adjustment';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface TransactionHistoryResult {
  transactions: WalletTransaction[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Service for wallet management operations
 */
export class WalletService {
  /**
   * Create a new wallet
   */
  static async createWallet(params: CreateWalletParams): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        id: uuidv4(),
        user_id: params.userId,
        name: params.name,
        type: params.type,
        currency: params.currency,
        balance: 0,
        is_primary: params.isPrimary || false,
        status: 'active',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
    
    // If this is a primary wallet, update other wallets
    if (params.isPrimary) {
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', params.userId)
        .neq('id', data.id);
    }
    
    return data as Wallet;
  }
  
  /**
   * Get wallet by ID
   */
  static async getWallet(id: string): Promise<Wallet | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching wallet:', error);
      throw new Error(`Failed to fetch wallet: ${error.message}`);
    }
    
    return data as Wallet | null;
  }
  
  /**
   * Get all wallets for a user
   */
  static async getUserWallets(userId: string): Promise<Wallet[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user wallets:', error);
      throw new Error(`Failed to fetch user wallets: ${error.message}`);
    }
    
    return data as Wallet[];
  }
  
  /**
   * Update a wallet
   */
  static async updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    const supabase = getSupabaseClient();
    
    // Remove non-updatable fields
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.balance; // Balance should only be updated through transactions
    
    const { data, error } = await supabase
      .from('wallets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating wallet:', error);
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
    
    // If this wallet is being set as primary, update other wallets
    if (updates.is_primary) {
      const wallet = data as Wallet;
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', wallet.user_id)
        .neq('id', id);
    }
    
    return data as Wallet;
  }
  
  /**
   * Create a transaction
   */
  static async createTransaction(params: CreateTransactionParams): Promise<WalletTransaction> {
    const supabase = getSupabaseClient();
    
    // Format transaction data
    const transactionData = {
      id: uuidv4(),
      wallet_id: params.walletId,
      amount: params.amount,
      currency: params.currency,
      type: params.type,
      status: 'pending',
      description: params.description,
      metadata: params.metadata,
      reference_id: params.referenceId,
      merchant_name: params.merchantName,
      merchant_category: params.merchantCategory,
      merchant_location: params.merchantLocation,
      fee_amount: params.feeAmount,
      fee_currency: params.feeCurrency,
      source_wallet_id: params.sourceWalletId,
      destination_wallet_id: params.destinationWalletId
    };
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert(transactionData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
    
    return data as WalletTransaction;
  }
  
  /**
   * Complete a transaction (update status to completed)
   */
  static async completeTransaction(id: string): Promise<WalletTransaction> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wallet_transactions')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error completing transaction:', error);
      throw new Error(`Failed to complete transaction: ${error.message}`);
    }
    
    return data as WalletTransaction;
  }
  
  /**
   * Get transaction history for a wallet
   */
  static async getTransactionHistory(params: TransactionHistoryParams): Promise<TransactionHistoryResult> {
    const supabase = getSupabaseClient();
    
    // Set default values
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    const sort = params.sort || 'created_at';
    const order = params.order || 'desc';
    
    // Build query
    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', params.walletId)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (params.type) {
      query = query.eq('type', params.type);
    }
    
    if (params.status) {
      query = query.eq('status', params.status);
    }
    
    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    
    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }
    
    if (params.minAmount !== undefined) {
      query = query.gte('amount', params.minAmount);
    }
    
    if (params.maxAmount !== undefined) {
      query = query.lte('amount', params.maxAmount);
    }
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching transaction history:', error);
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
    
    // Return formatted result
    return {
      transactions: data as WalletTransaction[],
      pagination: {
        total: count || 0,
        offset,
        limit,
        hasMore: (count || 0) > offset + limit
      }
    };
  }
  
  /**
   * Perform a transfer between wallets
   */
  static async transferBetweenWallets(
    sourceWalletId: string,
    destinationWalletId: string,
    amount: number,
    currency: string,
    description?: string
  ): Promise<{ sourceTransaction: WalletTransaction; destinationTransaction: WalletTransaction }> {
    const supabase = getSupabaseClient();
    
    // Start a transaction
    const { error: txError } = await supabase.rpc('begin_transaction');
    if (txError) {
      throw new Error(`Failed to start transaction: ${txError.message}`);
    }
    
    try {
      // Create withdrawal from source wallet
      const sourceParams: CreateTransactionParams = {
        walletId: sourceWalletId,
        amount: -amount, // Negative for withdrawal
        currency,
        type: 'transfer',
        description: description || 'Transfer to another wallet',
        destinationWalletId
      };
      
      const sourceTransaction = await this.createTransaction(sourceParams);
      
      // Create deposit to destination wallet
      const destinationParams: CreateTransactionParams = {
        walletId: destinationWalletId,
        amount, // Positive for deposit
        currency,
        type: 'transfer',
        description: description || 'Transfer from another wallet',
        sourceWalletId,
        related_transaction_id: sourceTransaction.id
      };
      
      const destinationTransaction = await this.createTransaction(destinationParams);
      
      // Update the source transaction with the related transaction ID
      await supabase
        .from('wallet_transactions')
        .update({ related_transaction_id: destinationTransaction.id })
        .eq('id', sourceTransaction.id);
      
      // Complete both transactions
      await this.completeTransaction(sourceTransaction.id);
      await this.completeTransaction(destinationTransaction.id);
      
      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }
      
      return {
        sourceTransaction,
        destinationTransaction
      };
    } catch (error) {
      // Rollback the transaction on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }
}
