import { KeyRegistry } from './keyRegistry';
export interface KeyVersion {
    version: number;
    keyId: string;
    algorithm: string;
    created: Date;
    rotatedAt?: Date;
    status: 'active' | 'deprecated' | 'revoked';
    encryptedKey: string;
}
export interface EncryptionResult {
    ciphertext: string;
    keyVersion: number;
    algorithm: string;
    iv: string;
}
export interface RotationResult {
    newKeyId: string;
    newVersion: number;
    rotatedAt: Date;
    previousKeyId: string;
    reason: 'scheduled' | 'emergency' | 'manual';
}
/**
 * KMS Service implementing envelope encryption with key rotation
 *
 * Uses envelope encryption pattern:
 * 1. Master Key (stored in quantum-vault) encrypts Data Encryption Keys (DEKs)
 * 2. DEKs encrypt actual application data
 * 3. Key rotation creates new DEKs while keeping data accessible
 */
export declare class KMSService {
    private keyRegistry;
    private keyVersions;
    private currentVersion;
    constructor(keyRegistry?: KeyRegistry);
    /**
     * Initialize key versions from existing master key
     */
    private initializeKeyVersions;
    /**
     * Encrypt data using envelope encryption
     */
    encryptData(plaintext: string): Promise<EncryptionResult>;
    /**
     * Decrypt data using the appropriate key version
     */
    decryptData(encryptionResult: EncryptionResult): Promise<string>;
    /**
     * Rotate encryption keys (creates new DEK version)
     */
    rotateKeys(reason?: 'scheduled' | 'emergency' | 'manual'): Promise<RotationResult>;
    /**
     * Check if key rotation is needed based on schedule
     */
    checkRotationNeeded(): Promise<boolean>;
    /**
     * Emergency key rotation (immediate)
     */
    emergencyRotation(trigger: string): Promise<RotationResult>;
    /**
     * Get all key versions (for audit/monitoring)
     */
    getKeyVersionHistory(): KeyVersion[];
    /**
     * Revoke a specific key version
     */
    revokeKeyVersion(version: number, reason: string): Promise<void>;
    private getCurrentKeyVersion;
    private generateDataEncryptionKey;
    private encryptWithMasterKey;
    private decryptWithMasterKey;
    private parseTime;
    private parseDayOfWeek;
    private isTimeReached;
}
export declare const kmsService: KMSService;
