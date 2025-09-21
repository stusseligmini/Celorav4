"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kmsService = exports.KMSService = void 0;
const logger_1 = require("./logger");
const keyRegistry_1 = require("./keyRegistry");
const crypto_1 = __importDefault(require("crypto"));
/**
 * KMS Service implementing envelope encryption with key rotation
 *
 * Uses envelope encryption pattern:
 * 1. Master Key (stored in quantum-vault) encrypts Data Encryption Keys (DEKs)
 * 2. DEKs encrypt actual application data
 * 3. Key rotation creates new DEKs while keeping data accessible
 */
class KMSService {
    keyRegistry;
    keyVersions = new Map();
    currentVersion = 1;
    constructor(keyRegistry) {
        this.keyRegistry = keyRegistry || new keyRegistry_1.KeyRegistry();
        this.initializeKeyVersions();
    }
    /**
     * Initialize key versions from existing master key
     */
    initializeKeyVersions() {
        if (typeof window !== 'undefined') {
            logger_1.logger.warn('KMS initialization skipped on client side');
            return;
        }
        try {
            const activeKey = this.keyRegistry.getActiveKey();
            if (activeKey) {
                // Create initial DEK version based on master key
                const dek = this.generateDataEncryptionKey();
                const encryptedDEK = this.encryptWithMasterKey(dek, activeKey);
                const keyVersion = {
                    version: 1,
                    keyId: activeKey.keyId,
                    algorithm: 'aes-256-gcm',
                    created: new Date(activeKey.created),
                    status: 'active',
                    encryptedKey: encryptedDEK
                };
                this.keyVersions.set(1, keyVersion);
                this.currentVersion = 1;
                logger_1.logger.info({ keyId: activeKey.keyId, version: 1 }, 'KMS initialized with active key');
            }
        }
        catch (error) {
            logger_1.logger.error({ error: error.message }, 'Failed to initialize KMS');
        }
    }
    /**
     * Encrypt data using envelope encryption
     */
    async encryptData(plaintext) {
        const currentKey = this.getCurrentKeyVersion();
        if (!currentKey) {
            throw new Error('No active encryption key available');
        }
        // Decrypt DEK with master key
        const dek = this.decryptWithMasterKey(currentKey.encryptedKey);
        // Encrypt data with DEK
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', Buffer.from(dek, 'hex'), iv);
        let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        const encryptedData = ciphertext + ':' + authTag.toString('hex');
        return {
            ciphertext: encryptedData,
            keyVersion: currentKey.version,
            algorithm: currentKey.algorithm,
            iv: iv.toString('hex')
        };
    }
    /**
     * Decrypt data using the appropriate key version
     */
    async decryptData(encryptionResult) {
        const keyVersion = this.keyVersions.get(encryptionResult.keyVersion);
        if (!keyVersion) {
            throw new Error(`Key version ${encryptionResult.keyVersion} not found`);
        }
        if (keyVersion.status === 'revoked') {
            throw new Error(`Key version ${encryptionResult.keyVersion} has been revoked`);
        }
        // Decrypt DEK with master key
        const dek = this.decryptWithMasterKey(keyVersion.encryptedKey);
        // Split ciphertext and auth tag
        const [ciphertext, authTagHex] = encryptionResult.ciphertext.split(':');
        const authTag = Buffer.from(authTagHex, 'hex');
        // Decrypt data with DEK
        const iv = Buffer.from(encryptionResult.iv, 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', Buffer.from(dek, 'hex'), iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
    }
    /**
     * Rotate encryption keys (creates new DEK version)
     */
    async rotateKeys(reason = 'scheduled') {
        const currentKey = this.getCurrentKeyVersion();
        if (!currentKey) {
            throw new Error('No current key to rotate');
        }
        const activeKey = this.keyRegistry.getActiveKey();
        if (!activeKey) {
            throw new Error('No master key available for rotation');
        }
        // Generate new DEK
        const newDEK = this.generateDataEncryptionKey();
        const encryptedNewDEK = this.encryptWithMasterKey(newDEK, activeKey);
        // Create new key version
        const newVersion = this.currentVersion + 1;
        const newKeyVersion = {
            version: newVersion,
            keyId: `${activeKey.keyId}-v${newVersion}`,
            algorithm: 'aes-256-gcm',
            created: new Date(),
            rotatedAt: new Date(),
            status: 'active',
            encryptedKey: encryptedNewDEK
        };
        // Mark current key as deprecated
        currentKey.status = 'deprecated';
        currentKey.rotatedAt = new Date();
        // Update versions
        this.keyVersions.set(newVersion, newKeyVersion);
        this.currentVersion = newVersion;
        const result = {
            newKeyId: newKeyVersion.keyId,
            newVersion: newVersion,
            rotatedAt: newKeyVersion.rotatedAt,
            previousKeyId: currentKey.keyId,
            reason
        };
        logger_1.logger.info({
            newVersion,
            previousVersion: currentKey.version,
            reason
        }, 'Key rotation completed');
        return result;
    }
    /**
     * Check if key rotation is needed based on schedule
     */
    async checkRotationNeeded() {
        const schedule = this.keyRegistry.getRotationSchedule();
        if (!schedule) {
            return false;
        }
        const currentKey = this.getCurrentKeyVersion();
        if (!currentKey) {
            return true; // Need initial key
        }
        const now = new Date();
        const keyAge = now.getTime() - currentKey.created.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const oneWeekMs = 7 * oneDayMs;
        // Check daily rotation
        if (schedule.dailyRotation?.enabled) {
            const lastRotation = currentKey.rotatedAt || currentKey.created;
            const timeSinceRotation = now.getTime() - lastRotation.getTime();
            if (timeSinceRotation >= oneDayMs) {
                const targetTime = this.parseTime(schedule.dailyRotation.time);
                const currentTime = { hour: now.getHours(), minute: now.getMinutes() };
                if (this.isTimeReached(currentTime, targetTime)) {
                    return true;
                }
            }
        }
        // Check weekly rotation
        if (schedule.weeklyRotation?.enabled) {
            const lastRotation = currentKey.rotatedAt || currentKey.created;
            const timeSinceRotation = now.getTime() - lastRotation.getTime();
            if (timeSinceRotation >= oneWeekMs) {
                const targetDay = this.parseDayOfWeek(schedule.weeklyRotation.day);
                const currentDay = now.getDay();
                if (currentDay === targetDay) {
                    const targetTime = this.parseTime(schedule.weeklyRotation.time);
                    const currentTime = { hour: now.getHours(), minute: now.getMinutes() };
                    if (this.isTimeReached(currentTime, targetTime)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    /**
     * Emergency key rotation (immediate)
     */
    async emergencyRotation(trigger) {
        logger_1.logger.warn({ trigger }, 'Emergency key rotation initiated');
        const schedule = this.keyRegistry.getRotationSchedule();
        if (schedule?.emergencyRotation?.enabled &&
            schedule.emergencyRotation.triggers.includes(trigger)) {
            return await this.rotateKeys('emergency');
        }
        throw new Error(`Emergency rotation not enabled for trigger: ${trigger}`);
    }
    /**
     * Get all key versions (for audit/monitoring)
     */
    getKeyVersionHistory() {
        return Array.from(this.keyVersions.values()).sort((a, b) => b.version - a.version);
    }
    /**
     * Revoke a specific key version
     */
    async revokeKeyVersion(version, reason) {
        const keyVersion = this.keyVersions.get(version);
        if (!keyVersion) {
            throw new Error(`Key version ${version} not found`);
        }
        if (keyVersion.status === 'active' && version === this.currentVersion) {
            throw new Error('Cannot revoke the current active key. Rotate first.');
        }
        keyVersion.status = 'revoked';
        logger_1.logger.warn({ version, reason }, 'Key version revoked');
    }
    // Private helper methods
    getCurrentKeyVersion() {
        return this.keyVersions.get(this.currentVersion);
    }
    generateDataEncryptionKey() {
        return crypto_1.default.randomBytes(32).toString('hex'); // 256-bit key
    }
    encryptWithMasterKey(data, masterKey) {
        // Simplified master key encryption (in production, use actual master key)
        const iv = crypto_1.default.randomBytes(16);
        const key = crypto_1.default.createHash('sha256').update(masterKey.keyId).digest();
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    decryptWithMasterKey(encryptedData) {
        const activeKey = this.keyRegistry.getActiveKey();
        if (!activeKey) {
            throw new Error('No master key available for decryption');
        }
        // Split IV and encrypted data
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto_1.default.createHash('sha256').update(activeKey.keyId).digest();
        // Simplified master key decryption (in production, use actual master key)
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    parseTime(timeStr) {
        const [hour, minute] = timeStr.split(':').map(Number);
        return { hour, minute };
    }
    parseDayOfWeek(dayStr) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days.indexOf(dayStr.toLowerCase());
    }
    isTimeReached(current, target) {
        return current.hour >= target.hour && current.minute >= target.minute;
    }
}
exports.KMSService = KMSService;
// Singleton instance for application use
exports.kmsService = new KMSService();
