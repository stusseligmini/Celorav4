import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { logger } from './logger';
import { encryptString } from './crypto';
import { traced } from './tracing';
import { createAuditEvent } from '@celora/domain';
// NOTE: Strict Supabase typed client temporarily disabled due to TS inference issues.
// TODO: Re-enable createClient<Database> once path alias + generated types are finalized.

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

export class SupabaseService {
  private supabase: any; // loosened typing to avoid blocking build; see TODO above

  constructor(supabaseUrl?: string, supabaseAnonKey?: string) {
    // Use provided credentials or fallback to environment
    let url = supabaseUrl;
    let anonKey = supabaseAnonKey;
    
    if (!url || !anonKey) {
      // Only load env on server side or when explicitly needed
      if (typeof window === 'undefined') {
        const env = loadEnv();
        url = url || env.SUPABASE_URL;
        anonKey = anonKey || env.SUPABASE_ANON_KEY;
      }
    }
    
    if (!url || !anonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

  this.supabase = createClient(url, anonKey);
  }

  async createVirtualCard(userId: string, cardData: Partial<VirtualCardData> & { rawPayload?: string; encryptionKey?: string }): Promise<VirtualCardData | null> {
    try {
      let encrypted_payload = cardData.encrypted_payload || '';
      if (cardData.rawPayload && cardData.encryptionKey) {
        try {
          const encrypted = await encryptString(cardData.rawPayload, cardData.encryptionKey);
          encrypted_payload = JSON.stringify(encrypted);
        } catch (e) {
          logger.error({ e }, 'Failed to encrypt payload');
          return null;
        }
      }
      const { data, error } = await (this.supabase as any)
        .from('virtual_cards')
        .insert({
          user_id: userId,
          masked_pan: cardData.masked_pan || '**** **** **** ****',
          encrypted_payload,
          balance: cardData.balance || 0,
          currency: cardData.currency || 'USD',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to create virtual card');
        return null;
      }

      return data;
    } catch (err) {
      logger.error({ err }, 'Error creating virtual card');
      return null;
    }
  }

  async getVirtualCards(userId: string): Promise<VirtualCardData[]> {
    try {
      const { data, error } = await this.supabase
        .from('virtual_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error({ error }, 'Failed to fetch virtual cards');
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error({ err }, 'Error fetching virtual cards');
      return [];
    }
  }

  async updateCardBalance(cardId: string, newBalance: number): Promise<boolean> {
    try {
      const { error } = await (this.supabase as any)
        .from('virtual_cards')
        .update({ 
          balance: newBalance,
          updated_at: new Date()
        })
        .eq('id', cardId);

      if (error) {
        logger.error({ error }, 'Failed to update card balance');
        return false;
      }

      return true;
    } catch (err) {
      logger.error({ err }, 'Error updating card balance');
      return false;
    }
  }

  // Add real-time subscription for card balance updates
  subscribeToCardUpdates(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('virtual_cards')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'virtual_cards',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe();
  }

  async getTransactions(userId: string, limit = 25) {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) { logger.error({ error }, 'Failed to fetch transactions'); return []; }
      return data || [];
    } catch (err) {
      logger.error({ err }, 'Error fetching transactions');
      return [];
    }
  }

  async createTransaction(params: {
    userId: string;
    cardId: string;
    amount: number;
    type: 'purchase'|'refund'|'fee'|'topup'|'withdrawal';
    merchantName?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const { data, error } = await (this.supabase as any)
        .from('transactions')
        .insert({
          card_id: params.cardId,
          user_id: params.userId,
          amount: params.amount,
            currency: 'USD',
          transaction_type: params.type,
          merchant_name: params.merchantName || null,
          status: 'pending',
          metadata: params.metadata || {}
        })
        .select()
        .single();
      if (error) { logger.error({ error }, 'Failed to create transaction'); return null; }
      return data;
    } catch (err) {
      logger.error({ err }, 'Error creating transaction');
      return null;
    }
  }

  subscribeToTransactions(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('transactions')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  async updateCardStatus(cardId: string, userId: string, status: 'active' | 'suspended'): Promise<boolean> {
    try {
      const { error } = await (this.supabase as any)
        .from('virtual_cards')
        .update({ 
          status,
          updated_at: new Date()
        })
        .eq('id', cardId)
        .eq('user_id', userId); // Ensure user owns the card

      if (error) {
        logger.error({ error }, 'Failed to update card status');
        return false;
      }

      logger.info({ cardId, status }, 'Card status updated successfully');
      return true;
    } catch (err) {
      logger.error({ err }, 'Error updating card status');
      return false;
    }
  }

  async getCardRiskScore(cardId: string, userId: string): Promise<number> {
    try {
      // For now, return a mock risk score based on card activity
      // In production, this would call the neural engine
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('card_id', cardId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
        .order('created_at', { ascending: false });

      // Simple risk calculation based on recent activity
      if (!transactions || transactions.length === 0) return 0.1; // Low risk for new cards
      
      const totalAmount = transactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      const transactionCount = transactions.length;
      
      // Higher risk for high volume or frequency
      let riskScore = Math.min(0.9, (totalAmount / 1000) * 0.3 + (transactionCount / 10) * 0.4);
      
      // Add some randomness for demo purposes
      riskScore += Math.random() * 0.2;
      
      return Math.max(0.05, Math.min(0.95, riskScore));
    } catch (err) {
      logger.error({ err }, 'Error calculating risk score');
      return 0.5; // Medium risk as fallback
    }
  }

  /**
   * Create an audit log entry (best-effort; failures are logged but non-fatal)
   */
  async createAuditLog(event: ReturnType<typeof createAuditEvent>): Promise<void> {
    try {
      await (this.supabase as any)
        .from('audit_log')
        .insert({
          actor_user_id: event.actorUserId,
          entity_type: event.entityType,
          entity_id: event.entityId,
          action: event.action,
          before: event.before || null,
          after: event.after || null,
          metadata: event.metadata || {},
          created_at: event.timestamp
        });
    } catch (err) {
      logger.warn({ err }, 'Failed to write audit log (non-fatal)');
    }
  }

  /**
   * Atomically (best-effort) add funds: update balance and create transaction + audit.
   * NOTE: Without a DB transaction / RPC, there is a race risk under concurrency.
   * This will be replaced later with a Postgres function. For now we mitigate by
   * performing the balance increment server-side.
   */
  async addFunds(params: { cardId: string; amount: number; currency: string; sourceType: string }): Promise<{ success: boolean; transactionId?: string; reason?: string; newBalance?: number }> {
    if (params.amount <= 0) return { success: false, reason: 'Amount must be positive' };
    try {
      // Increment balance atomically using RPC-like update (PostgREST update with expression not supported, so fetch->update fallback)
      const { data: card, error: fetchErr } = await (this.supabase as any)
        .from('virtual_cards')
        .select('*')
        .eq('id', params.cardId)
        .single();
      if (fetchErr || !card) return { success: false, reason: 'Card not found' };
      if (card.status === 'closed') return { success: false, reason: 'Card closed' };

      const newBalance = (card.balance || 0) + params.amount;
      const { error: updErr } = await (this.supabase as any)
        .from('virtual_cards')
        .update({ balance: newBalance, updated_at: new Date() })
        .eq('id', params.cardId);
      if (updErr) return { success: false, reason: 'Balance update failed' };

      const transactionId = crypto.randomUUID();
      const { error: txErr } = await (this.supabase as any)
        .from('transactions')
        .insert({
          id: transactionId,
          card_id: params.cardId,
          user_id: card.user_id,
          amount: params.amount,
          currency: params.currency,
          transaction_type: 'topup',
          status: 'posted',
          metadata: { sourceType: params.sourceType }
        });
      if (txErr) logger.error({ txErr }, 'Transaction insert failed after balance update');

      // Fire audit (non-blocking)
      this.createAuditLog(createAuditEvent({
        actorUserId: card.user_id,
        entityType: 'card',
        entityId: params.cardId,
        action: 'card_funded',
        before: { balance: card.balance },
        after: { balance: newBalance },
        metadata: { transactionId, amount: params.amount, currency: params.currency }
      }));

      return { success: true, transactionId, newBalance };
    } catch (err: any) {
      logger.error({ err }, 'addFunds failed');
      return { success: false, reason: err.message };
    }
  }
}