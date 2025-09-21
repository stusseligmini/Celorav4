import { logger } from './logger';
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

export class FundingBridge {
  constructor(private supabaseService: SupabaseService) {}

  async fundVirtualCard(req: FundingRequest): Promise<FundingResult> {
    const child = logger.child({ 
      corr: req.correlationId || crypto.randomUUID(), 
      card: req.targetCardId, 
      sourceType: req.sourceType 
    });
    
    try {
      child.info({ amount: req.amount, currency: req.currency }, 'Funding initiated');
      
      const result = await this.supabaseService.addFunds({
        cardId: req.targetCardId,
        amount: req.amount,
        currency: req.currency,
        sourceType: req.sourceType
      });

      if (result.success) {
        child.info({ transactionId: result.transactionId }, 'Funding completed successfully');
        return { success: true, transactionId: result.transactionId };
      }
      child.error({ reason: result.reason }, 'Funding failed');
      return { success: false, reason: result.reason };
    } catch (err: any) {
      child.error({ err }, 'Funding failed');
      return { success: false, reason: err.message };
    }
  }
}
