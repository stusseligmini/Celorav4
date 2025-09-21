"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationDomain = exports.UserProfile = exports.CrossPlatformTransaction = exports.CardWalletLink = void 0;
const zod_1 = require("zod");
// Integration between virtual cards and crypto wallets
exports.CardWalletLink = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    cardId: zod_1.z.string().uuid(), // Virtual card ID
    walletId: zod_1.z.string().uuid(), // Crypto wallet ID
    userId: zod_1.z.string().uuid(),
    autoTopupEnabled: zod_1.z.boolean().default(false),
    autoTopupThreshold: zod_1.z.number().optional(), // Minimum card balance before topup
    autoTopupAmount: zod_1.z.number().optional(), // Amount to topup
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
// Cross-platform transaction (crypto -> card or card -> crypto)
exports.CrossPlatformTransaction = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['crypto_to_card', 'card_to_crypto', 'card_to_card', 'wallet_to_wallet']),
    sourceId: zod_1.z.string().uuid(), // Card ID or Wallet ID
    targetId: zod_1.z.string().uuid(), // Card ID or Wallet ID
    amount: zod_1.z.number(),
    sourceCurrency: zod_1.z.string(),
    targetCurrency: zod_1.z.string(),
    exchangeRate: zod_1.z.number().optional(),
    fees: zod_1.z.number().default(0),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    blockchain: zod_1.z.string().optional(), // For crypto transactions
    transactionHash: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional()
});
// Enhanced user profile combining both implementations
exports.UserProfile = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    // KYC/Verification status
    kycStatus: zod_1.z.enum(['pending', 'verified', 'rejected', 'expired']).default('pending'),
    kycLevel: zod_1.z.enum(['basic', 'enhanced', 'premium']).default('basic'),
    verificationDocuments: zod_1.z.array(zod_1.z.string()).default([]),
    // Security settings
    twoFactorEnabled: zod_1.z.boolean().default(false),
    securityLevel: zod_1.z.enum(['basic', 'enhanced', 'premium']).default('basic'),
    // Preferences
    defaultCurrency: zod_1.z.string().default('USD'),
    notificationSettings: zod_1.z.record(zod_1.z.boolean()).default({}),
    // Limits and permissions
    dailyTransactionLimit: zod_1.z.number().default(1000),
    monthlyTransactionLimit: zod_1.z.number().default(10000),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastLoginAt: zod_1.z.date().optional()
});
class IntegrationDomain {
    /**
     * Calculate conversion amount between crypto and fiat
     */
    static calculateConversion(amount, fromCurrency, toCurrency, exchangeRate, feePercentage = 0.01) {
        const fees = amount * feePercentage;
        const convertedAmount = (amount - fees) * exchangeRate;
        return {
            convertedAmount,
            fees,
            totalCost: amount
        };
    }
    /**
     * Validate cross-platform transaction limits
     */
    static validateTransactionLimits(user, amount, currency, dailyTotal, monthlyTotal) {
        // Convert to USD equivalent for limit checking (simplified)
        const usdAmount = currency === 'USD' ? amount : amount; // Would need real exchange rate
        if (usdAmount > user.dailyTransactionLimit) {
            return { valid: false, reason: 'Exceeds daily transaction limit' };
        }
        if (dailyTotal + usdAmount > user.dailyTransactionLimit) {
            return { valid: false, reason: 'Would exceed daily transaction limit' };
        }
        if (monthlyTotal + usdAmount > user.monthlyTransactionLimit) {
            return { valid: false, reason: 'Would exceed monthly transaction limit' };
        }
        return { valid: true };
    }
    /**
     * Determine required KYC level for transaction
     */
    static getRequiredKycLevel(amount, currency) {
        const usdAmount = currency === 'USD' ? amount : amount; // Simplified
        if (usdAmount <= 100)
            return 'basic';
        if (usdAmount <= 1000)
            return 'enhanced';
        return 'premium';
    }
    /**
     * Check if auto-topup should trigger
     */
    static shouldTriggerAutoTopup(link, currentCardBalance, walletBalance) {
        if (!link.autoTopupEnabled)
            return { should: false, reason: 'Auto-topup disabled' };
        if (!link.autoTopupThreshold || !link.autoTopupAmount) {
            return { should: false, reason: 'Auto-topup not configured' };
        }
        if (currentCardBalance >= link.autoTopupThreshold) {
            return { should: false, reason: 'Card balance above threshold' };
        }
        if (walletBalance < link.autoTopupAmount) {
            return { should: false, reason: 'Insufficient wallet balance' };
        }
        return { should: true, amount: link.autoTopupAmount };
    }
}
exports.IntegrationDomain = IntegrationDomain;
