import { z } from 'zod';
export declare const WalletType: z.ZodEnum<["solana", "ethereum", "bitcoin"]>;
export declare const CryptoWallet: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    type: z.ZodEnum<["solana", "ethereum", "bitcoin"]>;
    address: z.ZodString;
    encryptedPrivateKey: z.ZodString;
    balance: z.ZodNumber;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    type: "solana" | "ethereum" | "bitcoin";
    address: string;
    encryptedPrivateKey: string;
    balance: number;
}, {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    type: "solana" | "ethereum" | "bitcoin";
    address: string;
    encryptedPrivateKey: string;
    balance: number;
    isActive?: boolean | undefined;
}>;
export type TCryptoWallet = z.infer<typeof CryptoWallet>;
export declare const UserSecurity: z.ZodObject<{
    userId: z.ZodString;
    hashedPin: z.ZodString;
    salt: z.ZodString;
    failedAttempts: z.ZodDefault<z.ZodNumber>;
    lockedUntil: z.ZodOptional<z.ZodDate>;
    lastLoginAt: z.ZodOptional<z.ZodDate>;
    securityLevel: z.ZodDefault<z.ZodEnum<["basic", "enhanced", "premium"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    securityLevel: "basic" | "enhanced" | "premium";
    hashedPin: string;
    salt: string;
    failedAttempts: number;
    lastLoginAt?: Date | undefined;
    lockedUntil?: Date | undefined;
}, {
    userId: string;
    hashedPin: string;
    salt: string;
    securityLevel?: "basic" | "enhanced" | "premium" | undefined;
    lastLoginAt?: Date | undefined;
    failedAttempts?: number | undefined;
    lockedUntil?: Date | undefined;
}>;
export type TUserSecurity = z.infer<typeof UserSecurity>;
export declare const WalletOperation: z.ZodObject<{
    id: z.ZodString;
    walletId: z.ZodString;
    type: z.ZodEnum<["send", "receive", "stake", "unstake", "swap"]>;
    amount: z.ZodNumber;
    currency: z.ZodString;
    toAddress: z.ZodOptional<z.ZodString>;
    fromAddress: z.ZodOptional<z.ZodString>;
    transactionHash: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "confirmed", "failed"]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    walletId: string;
    createdAt: Date;
    type: "send" | "receive" | "stake" | "unstake" | "swap";
    status: "pending" | "failed" | "confirmed";
    amount: number;
    currency: string;
    transactionHash?: string | undefined;
    metadata?: Record<string, any> | undefined;
    toAddress?: string | undefined;
    fromAddress?: string | undefined;
}, {
    id: string;
    walletId: string;
    createdAt: Date;
    type: "send" | "receive" | "stake" | "unstake" | "swap";
    status: "pending" | "failed" | "confirmed";
    amount: number;
    currency: string;
    transactionHash?: string | undefined;
    metadata?: Record<string, any> | undefined;
    toAddress?: string | undefined;
    fromAddress?: string | undefined;
}>;
export type TWalletOperation = z.infer<typeof WalletOperation>;
export declare class WalletDomain {
    /**
     * Validate PIN strength (from existing implementation)
     */
    static validatePin(pin: string): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Check if account is locked due to failed attempts
     */
    static isAccountLocked(security: TUserSecurity): boolean;
    /**
     * Calculate lock duration based on failed attempts
     */
    static calculateLockDuration(failedAttempts: number): number;
    /**
     * Validate wallet address format
     */
    static validateAddress(address: string, walletType: z.infer<typeof WalletType>): boolean;
    /**
     * Generate wallet operation summary
     */
    static summarizeOperations(operations: TWalletOperation[]): {
        totalSent: number;
        totalReceived: number;
        pendingCount: number;
        successCount: number;
    };
}
