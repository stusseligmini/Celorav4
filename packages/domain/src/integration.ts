import { z } from 'zod';

// Integration between virtual cards and crypto wallets
export const CardWalletLink = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(), // Virtual card ID
  walletId: z.string().uuid(), // Crypto wallet ID
  userId: z.string().uuid(),
  autoTopupEnabled: z.boolean().default(false),
  autoTopupThreshold: z.number().optional(), // Minimum card balance before topup
  autoTopupAmount: z.number().optional(), // Amount to topup
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TCardWalletLink = z.infer<typeof CardWalletLink>;

// Cross-platform transaction (crypto -> card or card -> crypto)
export const CrossPlatformTransaction = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['crypto_to_card', 'card_to_crypto', 'card_to_card', 'wallet_to_wallet']),
  sourceId: z.string().uuid(), // Card ID or Wallet ID
  targetId: z.string().uuid(), // Card ID or Wallet ID
  amount: z.number(),
  sourceCurrency: z.string(),
  targetCurrency: z.string(),
  exchangeRate: z.number().optional(),
  fees: z.number().default(0),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  blockchain: z.string().optional(), // For crypto transactions
  transactionHash: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional()
});

export type TCrossPlatformTransaction = z.infer<typeof CrossPlatformTransaction>;

// Enhanced user profile combining both implementations
export const UserProfile = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  
  // KYC/Verification status
  kycStatus: z.enum(['pending', 'verified', 'rejected', 'expired']).default('pending'),
  kycLevel: z.enum(['basic', 'enhanced', 'premium']).default('basic'),
  verificationDocuments: z.array(z.string()).default([]),
  
  // Security settings
  twoFactorEnabled: z.boolean().default(false),
  securityLevel: z.enum(['basic', 'enhanced', 'premium']).default('basic'),
  
  // Preferences
  defaultCurrency: z.string().default('USD'),
  notificationSettings: z.record(z.boolean()).default({}),
  
  // Limits and permissions
  dailyTransactionLimit: z.number().default(1000),
  monthlyTransactionLimit: z.number().default(10000),
  
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional()
});

export type TUserProfile = z.infer<typeof UserProfile>;

export class IntegrationDomain {
  /**
   * Calculate conversion amount between crypto and fiat
   */
  static calculateConversion(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    exchangeRate: number,
    feePercentage: number = 0.01
  ): { convertedAmount: number; fees: number; totalCost: number } {
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
  static validateTransactionLimits(
    user: TUserProfile,
    amount: number,
    currency: string,
    dailyTotal: number,
    monthlyTotal: number
  ): { valid: boolean; reason?: string } {
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
  static getRequiredKycLevel(amount: number, currency: string): z.infer<typeof UserProfile>['kycLevel'] {
    const usdAmount = currency === 'USD' ? amount : amount; // Simplified
    
    if (usdAmount <= 100) return 'basic';
    if (usdAmount <= 1000) return 'enhanced';
    return 'premium';
  }

  /**
   * Check if auto-topup should trigger
   */
  static shouldTriggerAutoTopup(
    link: TCardWalletLink,
    currentCardBalance: number,
    walletBalance: number
  ): { should: boolean; amount?: number; reason?: string } {
    if (!link.autoTopupEnabled) return { should: false, reason: 'Auto-topup disabled' };
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