import { EncryptedData } from './celoraSecurity';
export interface CryptoWallet {
    id: string;
    userId: string;
    type: 'solana' | 'ethereum' | 'bitcoin';
    address: string;
    encryptedPrivateKey: EncryptedData;
    balance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface WalletOperation {
    id: string;
    walletId: string;
    type: 'send' | 'receive' | 'stake' | 'unstake' | 'swap';
    amount: number;
    currency: string;
    toAddress?: string;
    fromAddress?: string;
    transactionHash?: string;
    status: 'pending' | 'confirmed' | 'failed';
    metadata?: Record<string, any>;
    createdAt: Date;
}
export declare class WalletLockedError extends Error {
    constructor(message: string);
}
export declare class CeloraWalletService {
    private supabase;
    private security;
    private solana;
    constructor(supabaseUrl?: string, supabaseKey?: string, encryptionKey?: string);
    /**
     * Create a new crypto wallet for user (integrates Python wallet logic)
     */
    createWallet(userId: string, walletType: 'solana' | 'ethereum' | 'bitcoin', address: string, privateKey: string, pin: string): Promise<{
        success: boolean;
        walletId?: string;
        error?: string;
    }>;
    /**
     * Add encrypted virtual card to wallet (integrates Python card logic)
     */
    addVirtualCard(userId: string, cardNumber: string, expiry: string, cvv: string, pin: string): Promise<{
        success: boolean;
        cardId?: string;
        error?: string;
    }>;
    /**
     * Get decrypted card details (requires PIN verification)
     */
    getCardDetails(userId: string, cardId: string, pin: string): Promise<{
        success: boolean;
        cardData?: any;
        error?: string;
    }>;
    /**
     * Verify user PIN (matches Python implementation behavior)
     */
    verifyPin(userId: string, pin: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * List user's wallets and cards
     */
    listUserAssets(userId: string): Promise<{
        wallets: CryptoWallet[];
        cards: Array<{
            id: string;
            maskedPan: string;
            balance: number;
            status: string;
        }>;
    }>;
    /**
     * Refresh balances for all active Solana wallets of the user (best-effort; logs errors per wallet)
     */
    refreshSolanaBalances(userId: string): Promise<{
        updated: number;
        failures: number;
    }>;
    private getUserSecurityState;
    private updateUserSecurityState;
    private updateUserSecurity;
    private maskAddress;
}
