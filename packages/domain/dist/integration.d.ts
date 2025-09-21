import { z } from 'zod';
export declare const CardWalletLink: z.ZodObject<{
    id: z.ZodString;
    cardId: z.ZodString;
    walletId: z.ZodString;
    userId: z.ZodString;
    autoTopupEnabled: z.ZodDefault<z.ZodBoolean>;
    autoTopupThreshold: z.ZodOptional<z.ZodNumber>;
    autoTopupAmount: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    cardId: string;
    walletId: string;
    userId: string;
    autoTopupEnabled: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    autoTopupThreshold?: number | undefined;
    autoTopupAmount?: number | undefined;
}, {
    id: string;
    cardId: string;
    walletId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    autoTopupEnabled?: boolean | undefined;
    autoTopupThreshold?: number | undefined;
    autoTopupAmount?: number | undefined;
    isActive?: boolean | undefined;
}>;
export type TCardWalletLink = z.infer<typeof CardWalletLink>;
export declare const CrossPlatformTransaction: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    type: z.ZodEnum<["crypto_to_card", "card_to_crypto", "card_to_card", "wallet_to_wallet"]>;
    sourceId: z.ZodString;
    targetId: z.ZodString;
    amount: z.ZodNumber;
    sourceCurrency: z.ZodString;
    targetCurrency: z.ZodString;
    exchangeRate: z.ZodOptional<z.ZodNumber>;
    fees: z.ZodDefault<z.ZodNumber>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed", "cancelled"]>;
    blockchain: z.ZodOptional<z.ZodString>;
    transactionHash: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodDate;
    completedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    createdAt: Date;
    type: "crypto_to_card" | "card_to_crypto" | "card_to_card" | "wallet_to_wallet";
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    sourceId: string;
    targetId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    fees: number;
    exchangeRate?: number | undefined;
    blockchain?: string | undefined;
    transactionHash?: string | undefined;
    metadata?: Record<string, any> | undefined;
    completedAt?: Date | undefined;
}, {
    id: string;
    userId: string;
    createdAt: Date;
    type: "crypto_to_card" | "card_to_crypto" | "card_to_card" | "wallet_to_wallet";
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    sourceId: string;
    targetId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    exchangeRate?: number | undefined;
    fees?: number | undefined;
    blockchain?: string | undefined;
    transactionHash?: string | undefined;
    metadata?: Record<string, any> | undefined;
    completedAt?: Date | undefined;
}>;
export type TCrossPlatformTransaction = z.infer<typeof CrossPlatformTransaction>;
export declare const UserProfile: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    kycStatus: z.ZodDefault<z.ZodEnum<["pending", "verified", "rejected", "expired"]>>;
    kycLevel: z.ZodDefault<z.ZodEnum<["basic", "enhanced", "premium"]>>;
    verificationDocuments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    twoFactorEnabled: z.ZodDefault<z.ZodBoolean>;
    securityLevel: z.ZodDefault<z.ZodEnum<["basic", "enhanced", "premium"]>>;
    defaultCurrency: z.ZodDefault<z.ZodString>;
    notificationSettings: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
    dailyTransactionLimit: z.ZodDefault<z.ZodNumber>;
    monthlyTransactionLimit: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    lastLoginAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    kycStatus: "pending" | "verified" | "rejected" | "expired";
    kycLevel: "basic" | "enhanced" | "premium";
    verificationDocuments: string[];
    twoFactorEnabled: boolean;
    securityLevel: "basic" | "enhanced" | "premium";
    defaultCurrency: string;
    notificationSettings: Record<string, boolean>;
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    lastLoginAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    kycStatus?: "pending" | "verified" | "rejected" | "expired" | undefined;
    kycLevel?: "basic" | "enhanced" | "premium" | undefined;
    verificationDocuments?: string[] | undefined;
    twoFactorEnabled?: boolean | undefined;
    securityLevel?: "basic" | "enhanced" | "premium" | undefined;
    defaultCurrency?: string | undefined;
    notificationSettings?: Record<string, boolean> | undefined;
    dailyTransactionLimit?: number | undefined;
    monthlyTransactionLimit?: number | undefined;
    lastLoginAt?: Date | undefined;
}>;
export type TUserProfile = z.infer<typeof UserProfile>;
export declare class IntegrationDomain {
    /**
     * Calculate conversion amount between crypto and fiat
     */
    static calculateConversion(amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number, feePercentage?: number): {
        convertedAmount: number;
        fees: number;
        totalCost: number;
    };
    /**
     * Validate cross-platform transaction limits
     */
    static validateTransactionLimits(user: TUserProfile, amount: number, currency: string, dailyTotal: number, monthlyTotal: number): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Determine required KYC level for transaction
     */
    static getRequiredKycLevel(amount: number, currency: string): z.infer<typeof UserProfile>['kycLevel'];
    /**
     * Check if auto-topup should trigger
     */
    static shouldTriggerAutoTopup(link: TCardWalletLink, currentCardBalance: number, walletBalance: number): {
        should: boolean;
        amount?: number;
        reason?: string;
    };
}
