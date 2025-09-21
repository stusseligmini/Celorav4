import { Transaction, VersionedTransaction } from '@solana/web3.js';
type Cluster = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet';
export interface SolanaServiceOptions {
    endpoint?: string;
    cluster?: Cluster;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    maxRetries?: number;
    timeoutMs?: number;
    rateLimitPerSecond?: number;
}
export declare class SolanaService {
    private connection;
    private opts;
    private rate;
    constructor(options?: SolanaServiceOptions);
    private refillTokens;
    private withRateLimit;
    private retry;
    validateAddress(address: string): boolean;
    getBalance(address: string): Promise<number>;
    getRecentBlockhash(): Promise<string>;
    getSlot(): Promise<number>;
    /**
     * Sync on-chain balance for a given wallet address and invoke a persistence callback.
     * The callback is responsible for updating the database (to avoid direct coupling here).
     */
    syncBalance(address: string, persist: (p: {
        address: string;
        balance: number;
        slot: number;
        ts: Date;
    }) => Promise<void>): Promise<{
        balance: number;
        slot: number;
    }>;
    signMessage(privateKey: Uint8Array, message: Uint8Array): Promise<Uint8Array>;
    sendRawTransaction(serialized: Uint8Array): Promise<string>;
    confirm(signature: string): Promise<boolean>;
    buildEmptyTransaction(feePayer: string): Promise<VersionedTransaction | Transaction>;
}
export {};
