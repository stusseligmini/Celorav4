"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaService = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("./logger");
class SolanaService {
    connection;
    opts;
    rate;
    constructor(options = {}) {
        const cluster = options.cluster || 'devnet';
        const endpoint = options.endpoint || (cluster === 'localnet' ? 'http://127.0.0.1:8899' : (0, web3_js_1.clusterApiUrl)(cluster));
        this.opts = {
            endpoint,
            cluster,
            commitment: options.commitment || 'confirmed',
            maxRetries: options.maxRetries ?? 3,
            timeoutMs: options.timeoutMs ?? 15_000,
            rateLimitPerSecond: options.rateLimitPerSecond ?? 10
        };
        this.connection = new web3_js_1.Connection(this.opts.endpoint, this.opts.commitment);
        this.rate = { tokens: this.opts.rateLimitPerSecond, lastRefill: Date.now() };
        logger_1.logger.info({ endpoint: this.opts.endpoint, cluster: this.opts.cluster }, 'SolanaService initialized');
    }
    refillTokens() {
        const now = Date.now();
        const elapsed = now - this.rate.lastRefill;
        if (elapsed >= 1000) {
            this.rate.tokens = this.opts.rateLimitPerSecond;
            this.rate.lastRefill = now;
        }
    }
    async withRateLimit(fn) {
        while (true) {
            this.refillTokens();
            if (this.rate.tokens > 0) {
                this.rate.tokens -= 1;
                break;
            }
            await new Promise(r => setTimeout(r, 50));
        }
        return fn();
    }
    async retry(label, fn, attempt = 1) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs);
            // For web3.js calls, we pass no signal; but the pattern left for future fetch-based calls
            const result = await fn();
            clearTimeout(timeout);
            return result;
        }
        catch (e) {
            if (attempt >= this.opts.maxRetries) {
                logger_1.logger.error({ label, attempt, error: e?.message }, 'Solana operation failed');
                throw e;
            }
            const backoff = 200 * Math.pow(2, attempt - 1);
            logger_1.logger.warn({ label, attempt, backoff }, 'Retrying Solana operation');
            await new Promise(r => setTimeout(r, backoff));
            return this.retry(label, fn, attempt + 1);
        }
    }
    validateAddress(address) {
        try {
            new web3_js_1.PublicKey(address); // throws if invalid
            return true;
        }
        catch {
            return false;
        }
    }
    async getBalance(address) {
        if (!this.validateAddress(address))
            throw new Error('Invalid address');
        return this.withRateLimit(() => this.retry('getBalance', async () => {
            const lamports = await this.connection.getBalance(new web3_js_1.PublicKey(address));
            return lamports / web3_js_1.LAMPORTS_PER_SOL;
        }));
    }
    async getRecentBlockhash() {
        return this.withRateLimit(() => this.retry('getLatestBlockhash', async () => {
            const { blockhash } = await this.connection.getLatestBlockhash('finalized');
            return blockhash;
        }));
    }
    async getSlot() {
        return this.withRateLimit(() => this.retry('getSlot', async () => this.connection.getSlot('finalized')));
    }
    /**
     * Sync on-chain balance for a given wallet address and invoke a persistence callback.
     * The callback is responsible for updating the database (to avoid direct coupling here).
     */
    async syncBalance(address, persist) {
        if (!this.validateAddress(address))
            throw new Error('Invalid address');
        const [balance, slot] = await Promise.all([
            this.getBalance(address),
            this.getSlot()
        ]);
        const ts = new Date();
        try {
            await persist({ address, balance, slot, ts });
        }
        catch (e) {
            logger_1.logger.warn({ address, error: e?.message }, 'Persist callback failed during syncBalance');
        }
        return { balance, slot };
    }
    // Placeholder sign method (in future integrate wallet key management)
    async signMessage(privateKey, message) {
        throw new Error('Signing not implemented: integrate ed25519 signer / key management layer');
    }
    // Broadcast a raw (versioned or legacy) transaction
    async sendRawTransaction(serialized) {
        return this.withRateLimit(() => this.retry('sendRawTransaction', async () => {
            const sig = await this.connection.sendRawTransaction(Buffer.from(serialized));
            return sig;
        }));
    }
    // High-level helper: confirm a signature
    async confirm(signature) {
        return this.withRateLimit(() => this.retry('confirm', async () => {
            const res = await this.connection.getSignatureStatuses([signature]);
            const status = res && res.value && res.value[0];
            return !!status && !!status.confirmationStatus;
        }));
    }
    // Build a placeholder empty transaction (for pipeline tests)
    async buildEmptyTransaction(feePayer) {
        if (!this.validateAddress(feePayer))
            throw new Error('Invalid fee payer');
        // For now we just create an empty legacy transaction with a recent blockhash
        const blockhash = await this.getRecentBlockhash();
        const tx = new web3_js_1.Transaction({ feePayer: new web3_js_1.PublicKey(feePayer), recentBlockhash: blockhash });
        return tx;
    }
}
exports.SolanaService = SolanaService;
