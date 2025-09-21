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
export declare class CrossPlatformTransactionError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class CrossPlatformService {
    private supabase;
    private walletService;
    private static EXCHANGE_RATES;
    constructor(supabaseUrl?: string, supabaseKey?: string);
    /**
     * Create a topup transaction (from wallet to card)
     */
    createTopup(request: CrossPlatformTxRequest): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    /**
     * Create a cashout transaction (from card to wallet)
     */
    createCashout(request: CrossPlatformTxRequest): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    /**
     * Create a conversion transaction (between wallets)
     */
    createConversion(request: CrossPlatformTxRequest): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    /**
     * Get recent cross-platform transactions for a user
     */
    getRecentTransactions(userId: string, limit?: number): Promise<CrossPlatformTransaction[]>;
    /**
     * Update transaction status (for async settlement)
     */
    updateTransactionStatus(transactionId: string, status: 'processing' | 'completed' | 'failed', failureReason?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    private processTransaction;
    private validateTransaction;
    private getExchangeRate;
    private calculateFee;
    private settleTransaction;
}
