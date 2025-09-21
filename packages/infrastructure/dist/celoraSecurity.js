"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CeloraSecurityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("./logger");
// Security constants from Python implementation
const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const LOCKOUT_SECONDS = 300;
const MAX_ATTEMPTS = 5;
class CeloraSecurityService {
    algorithm = 'aes-256-gcm';
    encryptionKey;
    constructor(encryptionKey) {
        if (encryptionKey) {
            this.encryptionKey = Buffer.from(encryptionKey, 'base64');
        }
        else {
            // Generate ephemeral key if none provided (for development)
            this.encryptionKey = crypto_1.default.randomBytes(32);
            logger_1.logger.warn('Using ephemeral encryption key - not suitable for production');
        }
    }
    /**
     * Hash PIN using PBKDF2 (matches Python implementation)
     */
    hashPin(pin) {
        const salt = crypto_1.default.randomBytes(SALT_BYTES);
        const hash = crypto_1.default.pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, 32, 'sha256');
        return {
            hash: Buffer.concat([salt, hash]).toString('base64'),
            salt: salt.toString('base64')
        };
    }
    /**
     * Verify PIN against stored hash (matches Python implementation)
     */
    verifyPin(pin, storedHash) {
        try {
            const raw = Buffer.from(storedHash, 'base64');
            const salt = raw.subarray(0, SALT_BYTES);
            const storedKey = raw.subarray(SALT_BYTES);
            const computedKey = crypto_1.default.pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, 32, 'sha256');
            return crypto_1.default.timingSafeEqual(storedKey, computedKey);
        }
        catch (error) {
            logger_1.logger.error('PIN verification failed');
            return false;
        }
    }
    /**
     * Encrypt sensitive data (card numbers, private keys)
     */
    encrypt(data) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(this.algorithm, this.encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            data: encrypted + authTag.toString('hex'),
            iv: iv.toString('hex')
        };
    }
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData) {
        try {
            const iv = Buffer.from(encryptedData.iv, 'hex');
            const encryptedText = encryptedData.data.slice(0, -32); // Remove auth tag
            const authTag = Buffer.from(encryptedData.data.slice(-32), 'hex');
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error('Decryption failed');
            throw new Error('Unable to decrypt data - invalid key or corrupted data');
        }
    }
    /**
     * Mask card number (matches Python implementation)
     */
    maskCardNumber(cardNumber) {
        const digits = cardNumber.replace(/\D/g, '');
        if (digits.length <= 4)
            return digits;
        const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
        return masked.replace(/(.{4})/g, '$1-').slice(0, -1);
    }
    /**
     * Validate card number using Luhn algorithm (matches Python implementation)
     */
    validateCardNumber(cardNumber) {
        const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
        if (digits.length === 0)
            return false;
        let sum = 0;
        const parity = digits.length % 2;
        for (let i = 0; i < digits.length; i++) {
            let digit = digits[i];
            if (i % 2 === parity) {
                digit *= 2;
                if (digit > 9)
                    digit -= 9;
            }
            sum += digit;
        }
        return sum % 10 === 0;
    }
    /**
     * Validate expiry date (MM/YY or MM/YYYY format)
     */
    validateExpiry(expiry) {
        try {
            const parts = expiry.split('/');
            if (parts.length !== 2)
                return false;
            const month = parseInt(parts[0], 10);
            let year = parseInt(parts[1], 10);
            if (month < 1 || month > 12)
                return false;
            if (year < 100)
                year += 2000;
            const now = new Date();
            const expiryDate = new Date(year, month - 1); // month is 0-indexed
            return expiryDate > now;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if account is locked due to failed attempts
     */
    isAccountLocked(securityState) {
        return Date.now() < securityState.lockedUntil;
    }
    /**
     * Update security state after PIN attempt
     */
    updateSecurityState(securityState, success) {
        const now = Date.now();
        if (success) {
            return {
                ...securityState,
                failedAttempts: 0,
                lockedUntil: 0,
                lastAttempt: now
            };
        }
        const newFailedAttempts = securityState.failedAttempts + 1;
        const lockedUntil = newFailedAttempts >= MAX_ATTEMPTS
            ? now + (LOCKOUT_SECONDS * 1000)
            : securityState.lockedUntil;
        if (lockedUntil > now) {
            logger_1.logger.warn(`Account locked due to ${newFailedAttempts} failed attempts`);
        }
        return {
            failedAttempts: newFailedAttempts,
            lockedUntil,
            lastAttempt: now
        };
    }
    /**
     * Generate secure API request signature (for external API calls)
     */
    signRequest(data, apiKey) {
        return crypto_1.default
            .createHmac('sha256', apiKey)
            .update(data)
            .digest('hex');
    }
    /**
     * Generate secure random token for sessions/IDs
     */
    generateSecureToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
}
exports.CeloraSecurityService = CeloraSecurityService;
