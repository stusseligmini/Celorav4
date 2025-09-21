export interface EncryptedData {
    data: string;
    iv: string;
}
export interface PinHashResult {
    hash: string;
    salt: string;
}
export interface SecurityState {
    failedAttempts: number;
    lockedUntil: number;
    lastAttempt: number;
}
export declare class CeloraSecurityService {
    private readonly algorithm;
    private readonly encryptionKey;
    constructor(encryptionKey?: string);
    /**
     * Hash PIN using PBKDF2 (matches Python implementation)
     */
    hashPin(pin: string): PinHashResult;
    /**
     * Verify PIN against stored hash (matches Python implementation)
     */
    verifyPin(pin: string, storedHash: string): boolean;
    /**
     * Encrypt sensitive data (card numbers, private keys)
     */
    encrypt(data: string): EncryptedData;
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData: EncryptedData): string;
    /**
     * Mask card number (matches Python implementation)
     */
    maskCardNumber(cardNumber: string): string;
    /**
     * Validate card number using Luhn algorithm (matches Python implementation)
     */
    validateCardNumber(cardNumber: string): boolean;
    /**
     * Validate expiry date (MM/YY or MM/YYYY format)
     */
    validateExpiry(expiry: string): boolean;
    /**
     * Check if account is locked due to failed attempts
     */
    isAccountLocked(securityState: SecurityState): boolean;
    /**
     * Update security state after PIN attempt
     */
    updateSecurityState(securityState: SecurityState, success: boolean): SecurityState;
    /**
     * Generate secure API request signature (for external API calls)
     */
    signRequest(data: string, apiKey: string): string;
    /**
     * Generate secure random token for sessions/IDs
     */
    generateSecureToken(length?: number): string;
}
