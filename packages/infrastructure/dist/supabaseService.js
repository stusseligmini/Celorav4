"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
const logger_1 = require("./logger");
const crypto_1 = require("./crypto");
const domain_1 = require("@celora/domain");
class SupabaseService {
    supabase; // loosened typing to avoid blocking build; see TODO above
    constructor(supabaseUrl, supabaseAnonKey) {
        // Use provided credentials or fallback to environment
        let url = supabaseUrl;
        let anonKey = supabaseAnonKey;
        if (!url || !anonKey) {
            // Only load env on server side or when explicitly needed
            if (typeof window === 'undefined') {
                const env = (0, env_1.loadEnv)();
                url = url || env.SUPABASE_URL;
                anonKey = anonKey || env.SUPABASE_ANON_KEY;
            }
        }
        if (!url || !anonKey) {
            throw new Error('Supabase URL and Anon Key are required');
        }
        this.supabase = (0, supabase_js_1.createClient)(url, anonKey);
    }
    async createVirtualCard(userId, cardData) {
        try {
            let encrypted_payload = cardData.encrypted_payload || '';
            if (cardData.rawPayload && cardData.encryptionKey) {
                try {
                    const encrypted = await (0, crypto_1.encryptString)(cardData.rawPayload, cardData.encryptionKey);
                    encrypted_payload = JSON.stringify(encrypted);
                }
                catch (e) {
                    logger_1.logger.error({ e }, 'Failed to encrypt payload');
                    return null;
                }
            }
            const { data, error } = await this.supabase
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
                logger_1.logger.error({ error }, 'Failed to create virtual card');
                return null;
            }
            return data;
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error creating virtual card');
            return null;
        }
    }
    async getVirtualCards(userId) {
        try {
            const { data, error } = await this.supabase
                .from('virtual_cards')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error({ error }, 'Failed to fetch virtual cards');
                return [];
            }
            return data || [];
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error fetching virtual cards');
            return [];
        }
    }
    async updateCardBalance(cardId, newBalance) {
        try {
            const { error } = await this.supabase
                .from('virtual_cards')
                .update({
                balance: newBalance,
                updated_at: new Date()
            })
                .eq('id', cardId);
            if (error) {
                logger_1.logger.error({ error }, 'Failed to update card balance');
                return false;
            }
            return true;
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error updating card balance');
            return false;
        }
    }
    // Add real-time subscription for card balance updates
    subscribeToCardUpdates(userId, callback) {
        return this.supabase
            .channel('virtual_cards')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'virtual_cards',
            filter: `user_id=eq.${userId}`
        }, callback)
            .subscribe();
    }
    async getTransactions(userId, limit = 25) {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                logger_1.logger.error({ error }, 'Failed to fetch transactions');
                return [];
            }
            return data || [];
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error fetching transactions');
            return [];
        }
    }
    async createTransaction(params) {
        try {
            const { data, error } = await this.supabase
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
            if (error) {
                logger_1.logger.error({ error }, 'Failed to create transaction');
                return null;
            }
            return data;
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error creating transaction');
            return null;
        }
    }
    subscribeToTransactions(userId, callback) {
        return this.supabase
            .channel('transactions')
            .on('postgres_changes', {
            event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}`
        }, callback)
            .subscribe();
    }
    async updateCardStatus(cardId, userId, status) {
        try {
            const { error } = await this.supabase
                .from('virtual_cards')
                .update({
                status,
                updated_at: new Date()
            })
                .eq('id', cardId)
                .eq('user_id', userId); // Ensure user owns the card
            if (error) {
                logger_1.logger.error({ error }, 'Failed to update card status');
                return false;
            }
            logger_1.logger.info({ cardId, status }, 'Card status updated successfully');
            return true;
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error updating card status');
            return false;
        }
    }
    async getCardRiskScore(cardId, userId) {
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
            if (!transactions || transactions.length === 0)
                return 0.1; // Low risk for new cards
            const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const transactionCount = transactions.length;
            // Higher risk for high volume or frequency
            let riskScore = Math.min(0.9, (totalAmount / 1000) * 0.3 + (transactionCount / 10) * 0.4);
            // Add some randomness for demo purposes
            riskScore += Math.random() * 0.2;
            return Math.max(0.05, Math.min(0.95, riskScore));
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Error calculating risk score');
            return 0.5; // Medium risk as fallback
        }
    }
    /**
     * Create an audit log entry (best-effort; failures are logged but non-fatal)
     */
    async createAuditLog(event) {
        try {
            await this.supabase
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
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Failed to write audit log (non-fatal)');
        }
    }
    /**
     * Atomically (best-effort) add funds: update balance and create transaction + audit.
     * NOTE: Without a DB transaction / RPC, there is a race risk under concurrency.
     * This will be replaced later with a Postgres function. For now we mitigate by
     * performing the balance increment server-side.
     */
    async addFunds(params) {
        if (params.amount <= 0)
            return { success: false, reason: 'Amount must be positive' };
        try {
            // Increment balance atomically using RPC-like update (PostgREST update with expression not supported, so fetch->update fallback)
            const { data: card, error: fetchErr } = await this.supabase
                .from('virtual_cards')
                .select('*')
                .eq('id', params.cardId)
                .single();
            if (fetchErr || !card)
                return { success: false, reason: 'Card not found' };
            if (card.status === 'closed')
                return { success: false, reason: 'Card closed' };
            const newBalance = (card.balance || 0) + params.amount;
            const { error: updErr } = await this.supabase
                .from('virtual_cards')
                .update({ balance: newBalance, updated_at: new Date() })
                .eq('id', params.cardId);
            if (updErr)
                return { success: false, reason: 'Balance update failed' };
            const transactionId = crypto.randomUUID();
            const { error: txErr } = await this.supabase
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
            if (txErr)
                logger_1.logger.error({ txErr }, 'Transaction insert failed after balance update');
            // Fire audit (non-blocking)
            this.createAuditLog((0, domain_1.createAuditEvent)({
                actorUserId: card.user_id,
                entityType: 'card',
                entityId: params.cardId,
                action: 'card_funded',
                before: { balance: card.balance },
                after: { balance: newBalance },
                metadata: { transactionId, amount: params.amount, currency: params.currency }
            }));
            return { success: true, transactionId, newBalance };
        }
        catch (err) {
            logger_1.logger.error({ err }, 'addFunds failed');
            return { success: false, reason: err.message };
        }
    }
}
exports.SupabaseService = SupabaseService;
