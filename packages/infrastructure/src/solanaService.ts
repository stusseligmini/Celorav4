import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';
import { logger } from './logger';

type Cluster = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet';

export interface SolanaServiceOptions {
  endpoint?: string;
  cluster?: Cluster;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  timeoutMs?: number;
  rateLimitPerSecond?: number;
}

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

export class SolanaService {
  private connection: Connection;
  private opts: Required<Omit<SolanaServiceOptions, 'endpoint' | 'cluster'>> & { endpoint: string; cluster: Cluster };
  private rate: RateBucket;

  constructor(options: SolanaServiceOptions = {}) {
    const cluster: Cluster = options.cluster || 'devnet';
    const endpoint = options.endpoint || (cluster === 'localnet' ? 'http://127.0.0.1:8899' : clusterApiUrl(cluster));
    this.opts = {
      endpoint,
      cluster,
      commitment: options.commitment || 'confirmed',
      maxRetries: options.maxRetries ?? 3,
      timeoutMs: options.timeoutMs ?? 15_000,
      rateLimitPerSecond: options.rateLimitPerSecond ?? 10
    };
    this.connection = new Connection(this.opts.endpoint, this.opts.commitment);
    this.rate = { tokens: this.opts.rateLimitPerSecond, lastRefill: Date.now() };
    logger.info({ endpoint: this.opts.endpoint, cluster: this.opts.cluster }, 'SolanaService initialized');
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.rate.lastRefill;
    if (elapsed >= 1000) {
      this.rate.tokens = this.opts.rateLimitPerSecond;
      this.rate.lastRefill = now;
    }
  }

  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
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

  private async retry<T>(label: string, fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs);
      // For web3.js calls, we pass no signal; but the pattern left for future fetch-based calls
      const result = await fn();
      clearTimeout(timeout);
      return result;
    } catch (e: any) {
      if (attempt >= this.opts.maxRetries) {
        logger.error({ label, attempt, error: e?.message }, 'Solana operation failed');
        throw e;
      }
      const backoff = 200 * Math.pow(2, attempt - 1);
      logger.warn({ label, attempt, backoff }, 'Retrying Solana operation');
      await new Promise(r => setTimeout(r, backoff));
      return this.retry(label, fn, attempt + 1);
    }
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address); // throws if invalid
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(address: string): Promise<number> {
    if (!this.validateAddress(address)) throw new Error('Invalid address');
    return this.withRateLimit(() => this.retry('getBalance', async () => {
      const lamports = await this.connection.getBalance(new PublicKey(address));
      return lamports / LAMPORTS_PER_SOL;
    }));
  }

  async getRecentBlockhash(): Promise<string> {
    return this.withRateLimit(() => this.retry('getLatestBlockhash', async () => {
      const { blockhash } = await this.connection.getLatestBlockhash('finalized');
      return blockhash;
    }));
  }

  async getSlot(): Promise<number> {
    return this.withRateLimit(() => this.retry('getSlot', async () => this.connection.getSlot('finalized')));
  }

  /**
   * Sync on-chain balance for a given wallet address and invoke a persistence callback.
   * The callback is responsible for updating the database (to avoid direct coupling here).
   */
  async syncBalance(address: string, persist: (p: { address: string; balance: number; slot: number; ts: Date }) => Promise<void>): Promise<{ balance: number; slot: number }> {
    if (!this.validateAddress(address)) throw new Error('Invalid address');
    const [balance, slot] = await Promise.all([
      this.getBalance(address),
      this.getSlot()
    ]);
    const ts = new Date();
    try {
      await persist({ address, balance, slot, ts });
    } catch (e: any) {
      logger.warn({ address, error: e?.message }, 'Persist callback failed during syncBalance');
    }
    return { balance, slot };
  }

  // Placeholder sign method (in future integrate wallet key management)
  async signMessage(privateKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    throw new Error('Signing not implemented: integrate ed25519 signer / key management layer');
  }

  // Broadcast a raw (versioned or legacy) transaction
  async sendRawTransaction(serialized: Uint8Array): Promise<string> {
    return this.withRateLimit(() => this.retry('sendRawTransaction', async () => {
      const sig = await this.connection.sendRawTransaction(Buffer.from(serialized));
      return sig;
    }));
  }

  // High-level helper: confirm a signature
  async confirm(signature: string): Promise<boolean> {
    return this.withRateLimit(() => this.retry('confirm', async () => {
      const res = await this.connection.getSignatureStatuses([signature]);
      const status = res && res.value && res.value[0];
      return !!status && !!status.confirmationStatus;
    }));
  }

  // Build a placeholder empty transaction (for pipeline tests)
  async buildEmptyTransaction(feePayer: string): Promise<VersionedTransaction | Transaction> {
    if (!this.validateAddress(feePayer)) throw new Error('Invalid fee payer');
    // For now we just create an empty legacy transaction with a recent blockhash
    const blockhash = await this.getRecentBlockhash();
    const tx = new Transaction({ feePayer: new PublicKey(feePayer), recentBlockhash: blockhash });
    return tx;
  }
}
