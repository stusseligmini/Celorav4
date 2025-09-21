import { createAuditEvent } from '@celora/domain';
interface VirtualCardData {
    id: string;
    user_id: string;
    masked_pan: string;
    encrypted_payload: string;
    balance: number;
    currency: string;
    status: 'active' | 'suspended' | 'closed';
    created_at: Date;
    updated_at: Date;
}
export declare class SupabaseService {
    private supabase;
    constructor(supabaseUrl?: string, supabaseAnonKey?: string);
    createVirtualCard(userId: string, cardData: Partial<VirtualCardData> & {
        rawPayload?: string;
        encryptionKey?: string;
    }): Promise<VirtualCardData | null>;
    getVirtualCards(userId: string): Promise<VirtualCardData[]>;
    updateCardBalance(cardId: string, newBalance: number): Promise<boolean>;
    subscribeToCardUpdates(userId: string, callback: (payload: any) => void): any;
    getTransactions(userId: string, limit?: number): Promise<any>;
    createTransaction(params: {
        userId: string;
        cardId: string;
        amount: number;
        type: 'purchase' | 'refund' | 'fee' | 'topup' | 'withdrawal';
        merchantName?: string;
        metadata?: Record<string, any>;
    }): Promise<any>;
    subscribeToTransactions(userId: string, callback: (payload: any) => void): any;
    updateCardStatus(cardId: string, userId: string, status: 'active' | 'suspended'): Promise<boolean>;
    getCardRiskScore(cardId: string, userId: string): Promise<number>;
    /**
     * Create an audit log entry (best-effort; failures are logged but non-fatal)
     */
    createAuditLog(event: ReturnType<typeof createAuditEvent>): Promise<void>;
    /**
     * Atomically (best-effort) add funds: update balance and create transaction + audit.
     * NOTE: Without a DB transaction / RPC, there is a race risk under concurrency.
     * This will be replaced later with a Postgres function. For now we mitigate by
     * performing the balance increment server-side.
     */
    addFunds(params: {
        cardId: string;
        amount: number;
        currency: string;
        sourceType: string;
    }): Promise<{
        success: boolean;
        transactionId?: string;
        reason?: string;
        newBalance?: number;
    }>;
}
export {};
