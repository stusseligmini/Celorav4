"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletDomain = exports.WalletOperation = exports.UserSecurity = exports.CryptoWallet = exports.WalletType = void 0;
const zod_1 = require("zod");
// Wallet types based on existing celora implementation
exports.WalletType = zod_1.z.enum(['solana', 'ethereum', 'bitcoin']);
exports.CryptoWallet = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    type: exports.WalletType,
    address: zod_1.z.string(),
    encryptedPrivateKey: zod_1.z.string(),
    balance: zod_1.z.number().nonnegative(),
    isActive: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
// PIN and Security from existing implementation
exports.UserSecurity = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    hashedPin: zod_1.z.string(), // PBKDF2 hash
    salt: zod_1.z.string(),
    failedAttempts: zod_1.z.number().default(0),
    lockedUntil: zod_1.z.date().optional(),
    lastLoginAt: zod_1.z.date().optional(),
    securityLevel: zod_1.z.enum(['basic', 'enhanced', 'premium']).default('basic')
});
// Wallet operations from existing implementation
exports.WalletOperation = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    walletId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['send', 'receive', 'stake', 'unstake', 'swap']),
    amount: zod_1.z.number(),
    currency: zod_1.z.string(),
    toAddress: zod_1.z.string().optional(),
    fromAddress: zod_1.z.string().optional(),
    transactionHash: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'confirmed', 'failed']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date()
});
class WalletDomain {
    /**
     * Validate PIN strength (from existing implementation)
     */
    static validatePin(pin) {
        if (pin.length < 4)
            return { valid: false, reason: 'PIN must be at least 4 digits' };
        if (pin.length > 8)
            return { valid: false, reason: 'PIN must be at most 8 digits' };
        if (!/^\d+$/.test(pin))
            return { valid: false, reason: 'PIN must contain only digits' };
        // Check for simple patterns
        if (/(\d)\1{3,}/.test(pin))
            return { valid: false, reason: 'PIN cannot have repeating digits' };
        if (pin === '1234' || pin === '0000')
            return { valid: false, reason: 'PIN too common' };
        return { valid: true };
    }
    /**
     * Check if account is locked due to failed attempts
     */
    static isAccountLocked(security) {
        if (!security.lockedUntil)
            return false;
        return new Date() < security.lockedUntil;
    }
    /**
     * Calculate lock duration based on failed attempts
     */
    static calculateLockDuration(failedAttempts) {
        // Exponential backoff: 1min, 5min, 15min, 1hr, 24hr
        const durations = [60, 300, 900, 3600, 86400]; // seconds
        const index = Math.min(failedAttempts - 3, durations.length - 1);
        return index >= 0 ? durations[index] * 1000 : 0; // return milliseconds
    }
    /**
     * Validate wallet address format
     */
    static validateAddress(address, walletType) {
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
    static summarizeOperations(operations) {
        return operations.reduce((acc, op) => {
            if (op.status === 'confirmed') {
                acc.successCount++;
                if (op.type === 'send')
                    acc.totalSent += op.amount;
                if (op.type === 'receive')
                    acc.totalReceived += op.amount;
            }
            if (op.status === 'pending')
                acc.pendingCount++;
            return acc;
        }, { totalSent: 0, totalReceived: 0, pendingCount: 0, successCount: 0 });
    }
}
exports.WalletDomain = WalletDomain;
