import { SupabaseService } from './supabaseService';
export interface FundingRequest {
    sourceType: 'bank_transfer' | 'external_wallet' | 'crypto_deposit';
    targetCardId: string;
    amount: number;
    currency: string;
    correlationId?: string;
}
export interface FundingResult {
    success: boolean;
    transactionId?: string;
    reason?: string;
}
export declare class FundingBridge {
    private supabaseService;
    constructor(supabaseService: SupabaseService);
    fundVirtualCard(req: FundingRequest): Promise<FundingResult>;
}
