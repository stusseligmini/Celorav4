import { z } from 'zod';

// Wallet types based on existing celora implementation
export const WalletType = z.enum(['solana', 'ethereum', 'bitcoin']);

export const CryptoWallet = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: WalletType,
  address: z.string(),
  encryptedPrivateKey: z.string(),
  balance: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TCryptoWallet = z.infer<typeof CryptoWallet>;

// PIN and Security from existing implementation
export const UserSecurity = z.object({
  userId: z.string().uuid(),
  hashedPin: z.string(), // PBKDF2 hash
  salt: z.string(),
  failedAttempts: z.number().default(0),
  lockedUntil: z.date().optional(),
  lastLoginAt: z.date().optional(),
  securityLevel: z.enum(['basic', 'enhanced', 'premium']).default('basic')
});

export type TUserSecurity = z.infer<typeof UserSecurity>;

// Wallet operations from existing implementation
export const WalletOperation = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  type: z.enum(['send', 'receive', 'stake', 'unstake', 'swap']),
  amount: z.number(),
  currency: z.string(),
  toAddress: z.string().optional(),
  fromAddress: z.string().optional(),
  transactionHash: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
});

export type TWalletOperation = z.infer<typeof WalletOperation>;

export class WalletDomain {
  /**
   * Validate PIN strength (from existing implementation)
   */
  static validatePin(pin: string): { valid: boolean; reason?: string } {
    if (pin.length < 4) return { valid: false, reason: 'PIN must be at least 4 digits' };
    if (pin.length > 8) return { valid: false, reason: 'PIN must be at most 8 digits' };
    if (!/^\d+$/.test(pin)) return { valid: false, reason: 'PIN must contain only digits' };
    
    // Check for simple patterns
    if (/(\d)\1{3,}/.test(pin)) return { valid: false, reason: 'PIN cannot have repeating digits' };
    if (pin === '1234' || pin === '0000') return { valid: false, reason: 'PIN too common' };
    
    return { valid: true };
  }

  /**
   * Check if account is locked due to failed attempts
   */
  static isAccountLocked(security: TUserSecurity): boolean {
    if (!security.lockedUntil) return false;
    return new Date() < security.lockedUntil;
  }

  /**
   * Calculate lock duration based on failed attempts
   */
  static calculateLockDuration(failedAttempts: number): number {
    // Exponential backoff: 1min, 5min, 15min, 1hr, 24hr
    const durations = [60, 300, 900, 3600, 86400]; // seconds
    const index = Math.min(failedAttempts - 3, durations.length - 1);
    return index >= 0 ? durations[index] * 1000 : 0; // return milliseconds
  }

  /**
   * Validate wallet address format
   */
  static validateAddress(address: string, walletType: z.infer<typeof WalletType>): boolean {
    switch (walletType) {
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case 'ethereum':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'bitcoin':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      default:
        return false;
    }
  }

  /**
   * Generate wallet operation summary
   */
  static summarizeOperations(operations: TWalletOperation[]): {
    totalSent: number;
    totalReceived: number;
    pendingCount: number;
    successCount: number;
  } {
    return operations.reduce((acc, op) => {
      if (op.status === 'confirmed') {
        acc.successCount++;
        if (op.type === 'send') acc.totalSent += op.amount;
        if (op.type === 'receive') acc.totalReceived += op.amount;
      }
      if (op.status === 'pending') acc.pendingCount++;
      return acc;
    }, { totalSent: 0, totalReceived: 0, pendingCount: 0, successCount: 0 });
  }
}