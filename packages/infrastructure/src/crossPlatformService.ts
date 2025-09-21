import { SupabaseService } from './supabaseService';
import { CeloraWalletService } from './celoraWalletService';
import { logger } from './logger';
import { createAuditEvent } from '@celora/domain';

export interface CrossPlatformTxRequest {
  userId: string;
  cardId?: string;
  walletId?: string;
  transactionType: 'topup' | 'cashout' | 'conversion' | 'payment';
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  providerRef?: string;
}

export interface CrossPlatformTransaction {
  id: string;
  userId: string;
  cardId?: string;
  walletId?: string;
  transactionType: 'topup' | 'cashout' | 'conversion' | 'payment';
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  fee: number;
  feeCurrency?: string;
  providerRef?: string;
  failureReason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class CrossPlatformTransactionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CrossPlatformTransactionError';
  }
}

export class CrossPlatformService {
  private supabase: SupabaseService;
  private walletService: CeloraWalletService;

  // Mock exchange rates (in production, fetch from external API)
  private static EXCHANGE_RATES: Record<string, Record<string, number>> = {
    'USD': { 'SOL': 0.01, 'ETH': 0.0003, 'BTC': 0.000025, 'USD': 1 },
    'SOL': { 'USD': 100, 'ETH': 0.03, 'BTC': 0.0025, 'SOL': 1 },
    'ETH': { 'USD': 3333, 'SOL': 33.33, 'BTC': 0.083, 'ETH': 1 },
    'BTC': { 'USD': 40000, 'SOL': 400, 'ETH': 12, 'BTC': 1 }
  };

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = new SupabaseService(supabaseUrl, supabaseKey);
    this.walletService = new CeloraWalletService(supabaseUrl, supabaseKey);
  }

  /**
   * Create a topup transaction (from wallet to card)
   */
  async createTopup(request: CrossPlatformTxRequest): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (request.transactionType !== 'topup') {
      return { success: false, error: 'Invalid transaction type for topup' };
    }

    if (!request.walletId || !request.cardId) {
      return { success: false, error: 'Both walletId and cardId required for topup' };
    }

    return this.processTransaction({
      ...request,
      metadata: { ...request, flow: 'wallet_to_card' }
    });
  }

  /**
   * Create a cashout transaction (from card to wallet)
   */
  async createCashout(request: CrossPlatformTxRequest): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (request.transactionType !== 'cashout') {
      return { success: false, error: 'Invalid transaction type for cashout' };
    }

    if (!request.walletId || !request.cardId) {
      return { success: false, error: 'Both walletId and cardId required for cashout' };
    }

    return this.processTransaction({
      ...request,
      metadata: { ...request, flow: 'card_to_wallet' }
    });
  }

  /**
   * Create a conversion transaction (between wallets)
   */
  async createConversion(request: CrossPlatformTxRequest): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (request.transactionType !== 'conversion') {
      return { success: false, error: 'Invalid transaction type for conversion' };
    }

    if (!request.walletId) {
      return { success: false, error: 'WalletId required for conversion' };
    }

    return this.processTransaction({
      ...request,
      metadata: { ...request, flow: 'wallet_to_wallet' }
    });
  }

  /**
   * Get recent cross-platform transactions for a user
   */
  async getRecentTransactions(userId: string, limit = 25): Promise<CrossPlatformTransaction[]> {
    try {
      const { data, error } = await (this.supabase as any).supabase
        .from('cross_platform_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error({ error }, 'Failed to fetch cross-platform transactions');
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Error fetching cross-platform transactions');
      return [];
    }
  }

  /**
   * Update transaction status (for async settlement)
   */
  async updateTransactionStatus(
    transactionId: string, 
    status: 'processing' | 'completed' | 'failed',
    failureReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { status, updated_at: new Date() };
      if (failureReason) updateData.failure_reason = failureReason;

      const { error } = await (this.supabase as any).supabase
        .from('cross_platform_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) {
        logger.error({ error, transactionId }, 'Failed to update transaction status');
        return { success: false, error: 'Database update failed' };
      }

      // If completed, apply balance changes
      if (status === 'completed') {
        await this.settleTransaction(transactionId);
      }

      return { success: true };
    } catch (error) {
      logger.error({ error, transactionId }, 'Error updating transaction status');
      return { success: false, error: 'Internal error' };
    }
  }

  // Private methods

  private async processTransaction(request: CrossPlatformTxRequest & { metadata?: any }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Validate inputs
      const validationError = this.validateTransaction(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Calculate exchange rate and fee
      const exchangeRate = request.exchangeRate || this.getExchangeRate(request.sourceCurrency, request.targetCurrency);
      const fee = this.calculateFee(request.amount, request.transactionType);

      // Create transaction record
      const transactionId = crypto.randomUUID();
      const { error } = await (this.supabase as any).supabase
        .from('cross_platform_transactions')
        .insert({
          id: transactionId,
          user_id: request.userId,
          card_id: request.cardId || null,
          wallet_id: request.walletId || null,
          transaction_type: request.transactionType,
          amount: request.amount,
          source_currency: request.sourceCurrency,
          target_currency: request.targetCurrency,
          exchange_rate: exchangeRate,
          fee: fee,
          fee_currency: request.sourceCurrency,
          provider_ref: request.providerRef || null,
          status: 'pending',
          metadata: request.metadata || {},
          created_at: new Date(),
          updated_at: new Date()
        });

      if (error) {
        logger.error({ error }, 'Failed to create cross-platform transaction');
        return { success: false, error: 'Database error' };
      }

      // Audit log
      await this.supabase.createAuditLog(createAuditEvent({
        actorUserId: request.userId,
        entityType: 'cross_platform_tx' as any,
        entityId: transactionId,
        action: 'transaction_created',
        metadata: {
          type: request.transactionType,
          amount: request.amount,
          sourceCurrency: request.sourceCurrency,
          targetCurrency: request.targetCurrency,
          fee
        }
      }));

      // For demo: immediately process to completed (in production, this would be async)
      setTimeout(() => this.updateTransactionStatus(transactionId, 'completed'), 1000);

      logger.info({ transactionId, type: request.transactionType }, 'Cross-platform transaction created');
      return { success: true, transactionId };

    } catch (error) {
      logger.error({ error }, 'Cross-platform transaction failed');
      return { success: false, error: 'Internal error' };
    }
  }

  private validateTransaction(request: CrossPlatformTxRequest): string | null {
    if (request.amount <= 0) return 'Amount must be positive';
    if (request.amount > 1000000) return 'Amount exceeds maximum limit';
    if (!request.sourceCurrency || !request.targetCurrency) return 'Source and target currencies required';
    
    const supportedCurrencies = ['USD', 'SOL', 'ETH', 'BTC'];
    if (!supportedCurrencies.includes(request.sourceCurrency)) return `Unsupported source currency: ${request.sourceCurrency}`;
    if (!supportedCurrencies.includes(request.targetCurrency)) return `Unsupported target currency: ${request.targetCurrency}`;

    return null;
  }

  private getExchangeRate(sourceCurrency: string, targetCurrency: string): number {
    const rates = CrossPlatformService.EXCHANGE_RATES[sourceCurrency];
    if (!rates || !rates[targetCurrency]) {
      throw new CrossPlatformTransactionError(`Exchange rate not available for ${sourceCurrency} -> ${targetCurrency}`, 'EXCHANGE_RATE_UNAVAILABLE');
    }
    return rates[targetCurrency];
  }

  private calculateFee(amount: number, transactionType: string): number {
    // Simple fee structure (in production, this would be more sophisticated)
    const feeRates = {
      topup: 0.005,     // 0.5%
      cashout: 0.01,    // 1%
      conversion: 0.003, // 0.3%
      payment: 0.002    // 0.2%
    };
    
    const rate = feeRates[transactionType as keyof typeof feeRates] || 0.005;
    return Math.max(amount * rate, 0.01); // Minimum fee of 0.01
  }

  private async settleTransaction(transactionId: string): Promise<void> {
    try {
      // Get transaction details
      const { data: tx, error } = await (this.supabase as any).supabase
        .from('cross_platform_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !tx) {
        logger.error({ error, transactionId }, 'Transaction not found for settlement');
        return;
      }

      // Apply balance changes based on transaction type
      if (tx.transaction_type === 'topup' && tx.card_id) {
        // Add funds to card
        const targetAmount = tx.amount * (tx.exchange_rate || 1);
        await this.supabase.addFunds({
          cardId: tx.card_id,
          amount: targetAmount - tx.fee,
          currency: tx.target_currency,
          sourceType: 'cross_platform_topup'
        });
      }

      // Audit settlement
      await this.supabase.createAuditLog(createAuditEvent({
        actorUserId: tx.user_id,
        entityType: 'cross_platform_tx' as any,
        entityId: transactionId,
        action: 'transaction_settled',
        metadata: { settledAt: new Date().toISOString() }
      }));

    } catch (error) {
      logger.error({ error, transactionId }, 'Transaction settlement failed');
    }
  }
}