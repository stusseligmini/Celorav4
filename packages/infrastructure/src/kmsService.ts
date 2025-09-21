import { logger } from './logger';
import { KeyRegistry, ActiveKeyInfo } from './keyRegistry';
import crypto from 'crypto';

export interface KeyVersion {
  version: number;
  keyId: string;
  algorithm: string;
  created: Date;
  rotatedAt?: Date;
  status: 'active' | 'deprecated' | 'revoked';
  encryptedKey: string; // DEK encrypted with master key
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
export class KMSService {
  private keyRegistry: KeyRegistry;
  private keyVersions: Map<number, KeyVersion> = new Map();
  private currentVersion: number = 1;

  constructor(keyRegistry?: KeyRegistry) {
    this.keyRegistry = keyRegistry || new KeyRegistry();
    this.initializeKeyVersions();
  }

  /**
   * Initialize key versions from existing master key
   */
  private initializeKeyVersions(): void {
    if (typeof window !== 'undefined') {
      logger.warn('KMS initialization skipped on client side');
      return;
    }

    try {
      const activeKey = this.keyRegistry.getActiveKey();
      if (activeKey) {
        // Create initial DEK version based on master key
        const dek = this.generateDataEncryptionKey();
        const encryptedDEK = this.encryptWithMasterKey(dek, activeKey);
        
        const keyVersion: KeyVersion = {
          version: 1,
          keyId: activeKey.keyId,
          algorithm: 'aes-256-gcm',
          created: new Date(activeKey.created),
          status: 'active',
          encryptedKey: encryptedDEK
        };

        this.keyVersions.set(1, keyVersion);
        this.currentVersion = 1;
        
        logger.info({ keyId: activeKey.keyId, version: 1 }, 'KMS initialized with active key');
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to initialize KMS');
    }
  }

  /**
   * Encrypt data using envelope encryption
   */
  async encryptData(plaintext: string): Promise<EncryptionResult> {
    const currentKey = this.getCurrentKeyVersion();
    if (!currentKey) {
      throw new Error('No active encryption key available');
    }

    // Decrypt DEK with master key
    const dek = this.decryptWithMasterKey(currentKey.encryptedKey);
    
    // Encrypt data with DEK
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(dek, 'hex'), iv);
    
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
  async decryptData(encryptionResult: EncryptionResult): Promise<string> {
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
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(dek, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  /**
   * Rotate encryption keys (creates new DEK version)
   */
  async rotateKeys(reason: 'scheduled' | 'emergency' | 'manual' = 'scheduled'): Promise<RotationResult> {
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
    const newKeyVersion: KeyVersion = {
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

    const result: RotationResult = {
      newKeyId: newKeyVersion.keyId,
      newVersion: newVersion,
      rotatedAt: newKeyVersion.rotatedAt!,
      previousKeyId: currentKey.keyId,
      reason
    };

    logger.info({
      newVersion,
      previousVersion: currentKey.version,
      reason
    }, 'Key rotation completed');

    return result;
  }

  /**
   * Check if key rotation is needed based on schedule
   */
  async checkRotationNeeded(): Promise<boolean> {
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
  async emergencyRotation(trigger: string): Promise<RotationResult> {
    logger.warn({ trigger }, 'Emergency key rotation initiated');
    
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
  getKeyVersionHistory(): KeyVersion[] {
    return Array.from(this.keyVersions.values()).sort((a, b) => b.version - a.version);
  }

  /**
   * Revoke a specific key version
   */
  async revokeKeyVersion(version: number, reason: string): Promise<void> {
    const keyVersion = this.keyVersions.get(version);
    if (!keyVersion) {
      throw new Error(`Key version ${version} not found`);
    }

    if (keyVersion.status === 'active' && version === this.currentVersion) {
      throw new Error('Cannot revoke the current active key. Rotate first.');
    }

    keyVersion.status = 'revoked';
    logger.warn({ version, reason }, 'Key version revoked');
  }

  // Private helper methods

  private getCurrentKeyVersion(): KeyVersion | undefined {
    return this.keyVersions.get(this.currentVersion);
  }

  private generateDataEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex'); // 256-bit key
  }

  private encryptWithMasterKey(data: string, masterKey: ActiveKeyInfo): string {
    // Simplified master key encryption (in production, use actual master key)
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(masterKey.keyId).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptWithMasterKey(encryptedData: string): string {
    const activeKey = this.keyRegistry.getActiveKey();
    if (!activeKey) {
      throw new Error('No master key available for decryption');
    }

    // Split IV and encrypted data
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(activeKey.keyId).digest();
    
    // Simplified master key decryption (in production, use actual master key)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private parseTime(timeStr: string): { hour: number; minute: number } {
    const [hour, minute] = timeStr.split(':').map(Number);
    return { hour, minute };
  }

  private parseDayOfWeek(dayStr: string): number {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.indexOf(dayStr.toLowerCase());
  }

  private isTimeReached(current: { hour: number; minute: number }, target: { hour: number; minute: number }): boolean {
    return current.hour >= target.hour && current.minute >= target.minute;
  }
}

// Singleton instance for application use
export const kmsService = new KMSService();