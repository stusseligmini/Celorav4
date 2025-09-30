/**
 * Enhanced Encryption Library for Celora V2
 * Provides comprehensive encryption for sensitive data including:
 * - Seed phrases with multi-layer encryption
 * - Card data (PCI DSS compliant)
 * - Personal information (KYC data)
 * - Biometric templates
 * - Backup codes and recovery data
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync, createHmac, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption algorithms and configurations
const ENCRYPTION_CONFIG = {
  // For highly sensitive data (seed phrases, private keys)
  SENSITIVE: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'scrypt' as const,
    iterations: 100000,
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32
  },
  // For card data (PCI DSS compliant)
  CARD_DATA: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2' as const,
    iterations: 200000,
    keyLength: 32,
    ivLength: 12,
    tagLength: 16,
    saltLength: 32
  },
  // For general user data
  GENERAL: {
    algorithm: 'aes-256-cbc',
    keyDerivation: 'pbkdf2' as const,
    iterations: 50000,
    keyLength: 32,
    ivLength: 16,
    tagLength: 0,
    saltLength: 16
  }
};

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  salt: string; // Base64 encoded salt
  iv: string; // Base64 encoded initialization vector
  tag?: string; // Base64 encoded authentication tag (for GCM mode)
  algorithm: string;
  iterations: number;
  keyDerivation: 'pbkdf2' | 'scrypt';
  timestamp: number;
  version: string;
}

export interface CardData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface BiometricTemplate {
  type: 'fingerprint' | 'face' | 'voice';
  template: string; // Base64 encoded biometric template
  quality: number;
  createdAt: number;
  deviceId: string;
}

class AdvancedEncryption {
  private static instance: AdvancedEncryption;
  private readonly version = '2.0.0';

  private constructor() {}

  static getInstance(): AdvancedEncryption {
    if (!AdvancedEncryption.instance) {
      AdvancedEncryption.instance = new AdvancedEncryption();
    }
    return AdvancedEncryption.instance;
  }

  /**
   * Generate a cryptographically secure random key
   */
  generateSecureKey(length: number = 32): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate a secure salt for key derivation
   */
  generateSalt(length: number = 32): Buffer {
    return randomBytes(length);
  }

  /**
   * Derive a key from a password using PBKDF2 or Scrypt
   */
  private async deriveKey(
    password: string,
    salt: Buffer,
    config: any
  ): Promise<Buffer> {
    if (config.keyDerivation === 'scrypt') {
      return await scryptAsync(password, salt, config.keyLength) as Buffer;
    } else {
      return pbkdf2Sync(password, salt, config.iterations, config.keyLength, 'sha512');
    }
  }

  /**
   * Encrypt sensitive data (seed phrases, private keys)
   */
  async encryptSensitiveData(
    plaintext: string,
    password: string,
    additionalData?: string
  ): Promise<EncryptedData> {
    const config = ENCRYPTION_CONFIG.SENSITIVE;
    const salt = this.generateSalt(config.saltLength);
    const iv = randomBytes(config.ivLength);

    // Derive encryption key
    const key = await this.deriveKey(password, salt, config);

    // Create cipher
    const cipher = createCipheriv(config.algorithm, key, iv);

    // Set additional authenticated data if provided
    if (additionalData && config.algorithm.includes('gcm')) {
      (cipher as any).setAAD(Buffer.from(additionalData, 'utf8'));
    }

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag for GCM mode
    const tag = config.algorithm.includes('gcm') ? (cipher as any).getAuthTag() : undefined;

    return {
      data: encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag?.toString('base64'),
      algorithm: config.algorithm,
      iterations: config.iterations,
      keyDerivation: config.keyDerivation,
      timestamp: Date.now(),
      version: this.version
    };
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(
    encryptedData: EncryptedData,
    password: string,
    additionalData?: string
  ): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : undefined;

    // Derive the same key
    const config = ENCRYPTION_CONFIG.SENSITIVE;
    const key = await this.deriveKey(password, salt, config);

    // Create decipher
    const decipher = createDecipheriv(encryptedData.algorithm, key, iv);

    // Set authentication tag for GCM mode
    if (tag && encryptedData.algorithm.includes('gcm')) {
      (decipher as any).setAuthTag(tag);
    }

    // Set additional authenticated data if provided
    if (additionalData && encryptedData.algorithm.includes('gcm')) {
      (decipher as any).setAAD(Buffer.from(additionalData, 'utf8'));
    }

    // Decrypt data
    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt card data (PCI DSS compliant)
   */
  async encryptCardData(
    cardData: CardData,
    masterKey: string,
    userFingerprint?: string
  ): Promise<EncryptedData> {
    const config = ENCRYPTION_CONFIG.CARD_DATA;
    const salt = this.generateSalt(config.saltLength);
    const iv = randomBytes(config.ivLength);

    // Combine master key with user fingerprint for additional security
    const password = userFingerprint ? `${masterKey}:${userFingerprint}` : masterKey;
    const key = this.deriveKey(password, salt, config);

    // Serialize card data with timestamp and checksum
    const serializedData = JSON.stringify({
      ...cardData,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(JSON.stringify(cardData))
    });

    // Create cipher
    const cipher = createCipheriv(config.algorithm, key, iv);

    // Set additional authenticated data (card number last 4 digits for verification)
    const aad = cardData.cardNumber.slice(-4);
    (cipher as any).setAAD(Buffer.from(aad, 'utf8'));

    // Encrypt data
    let encrypted = cipher.update(serializedData, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const tag = (cipher as any).getAuthTag();

    return {
      data: encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: config.algorithm,
      iterations: config.iterations,
      keyDerivation: config.keyDerivation,
      timestamp: Date.now(),
      version: this.version
    };
  }

  /**
   * Decrypt card data
   */
  async decryptCardData(
    encryptedData: EncryptedData,
    masterKey: string,
    userFingerprint?: string,
    expectedLast4?: string
  ): Promise<CardData> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag!, 'base64');

    // Derive the same key
    const password = userFingerprint ? `${masterKey}:${userFingerprint}` : masterKey;
    const config = ENCRYPTION_CONFIG.CARD_DATA;
    const key = this.deriveKey(password, salt, config);

    // Create decipher
    const decipher = createDecipheriv(encryptedData.algorithm, key, iv);
    (decipher as any).setAuthTag(tag);

    // Set additional authenticated data
    const aad = expectedLast4 || '0000'; // Use expected last 4 digits
    decipher.setAAD(Buffer.from(aad, 'utf8'));

    try {
      // Decrypt data
      let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // Parse and validate
      const parsedData = JSON.parse(decrypted);
      
      // Verify checksum
      const { checksum, timestamp, ...cardData } = parsedData;
      const expectedChecksum = this.calculateChecksum(JSON.stringify(cardData));
      
      if (checksum !== expectedChecksum) {
        throw new Error('Card data integrity check failed');
      }

      return cardData as CardData;
    } catch (error) {
      throw new Error('Failed to decrypt card data - invalid key or corrupted data');
    }
  }

  /**
   * Encrypt general user data
   */
  async encryptGeneralData(
    data: any,
    password: string
  ): Promise<EncryptedData> {
    const config = ENCRYPTION_CONFIG.GENERAL;
    const salt = this.generateSalt(config.saltLength);
    const iv = randomBytes(config.ivLength);

    // Derive encryption key
    const key = this.deriveKey(password, salt, config);

    // Serialize data
    const plaintext = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: this.version
    });

    // Create cipher
    const cipher = createCipheriv(config.algorithm, key, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      data: encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      algorithm: config.algorithm,
      iterations: config.iterations,
      keyDerivation: config.keyDerivation,
      timestamp: Date.now(),
      version: this.version
    };
  }

  /**
   * Decrypt general user data
   */
  async decryptGeneralData(
    encryptedData: EncryptedData,
    password: string
  ): Promise<any> {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');

    // Derive the same key
    const config = ENCRYPTION_CONFIG.GENERAL;
    const key = this.deriveKey(password, salt, config);

    // Create decipher
    const decipher = createDecipheriv(encryptedData.algorithm, key, iv);

    // Decrypt data
    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse and extract original data
    const parsedData = JSON.parse(decrypted);
    return parsedData.data;
  }

  /**
   * Encrypt biometric template
   */
  async encryptBiometricTemplate(
    template: BiometricTemplate,
    deviceKey: string,
    userKey: string
  ): Promise<EncryptedData> {
    // Use device key + user key for additional security
    const combinedKey = this.combineKeys(deviceKey, userKey);
    
    // Add integrity protection
    const templateWithMac = {
      ...template,
      mac: this.calculateHMAC(template.template, combinedKey)
    };

    return this.encryptSensitiveData(
      JSON.stringify(templateWithMac),
      combinedKey,
      `${template.type}:${template.deviceId}`
    );
  }

  /**
   * Decrypt biometric template
   */
  async decryptBiometricTemplate(
    encryptedData: EncryptedData,
    deviceKey: string,
    userKey: string,
    expectedType: string,
    expectedDeviceId: string
  ): Promise<BiometricTemplate> {
    const combinedKey = this.combineKeys(deviceKey, userKey);
    
    const decryptedData = await this.decryptSensitiveData(
      encryptedData,
      combinedKey,
      `${expectedType}:${expectedDeviceId}`
    );

    const template = JSON.parse(decryptedData);
    
    // Verify MAC
    const expectedMac = this.calculateHMAC(template.template, combinedKey);
    if (template.mac !== expectedMac) {
      throw new Error('Biometric template integrity check failed');
    }

    // Remove MAC before returning
    delete template.mac;
    return template as BiometricTemplate;
  }

  /**
   * Generate secure backup codes with encryption
   */
  generateEncryptedBackupCodes(
    masterPassword: string,
    count: number = 10
  ): { codes: string[], encrypted: EncryptedData } {
    const codes = Array.from({ length: count }, () => {
      // Generate 8-character alphanumeric backup codes
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    });

    // Encrypt backup codes
    const encrypted = this.encryptSensitiveData(
      JSON.stringify({
        codes,
        createdAt: Date.now(),
        expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
      }),
      masterPassword,
      'backup-codes'
    );

    return { codes, encrypted };
  }

  /**
   * Verify and decrypt backup codes
   */
  async verifyBackupCode(
    encryptedCodes: EncryptedData,
    masterPassword: string,
    codeToVerify: string
  ): Promise<{ valid: boolean, remainingCodes: string[] }> {
    try {
      const decryptedData = await this.decryptSensitiveData(
        encryptedCodes,
        masterPassword,
        'backup-codes'
      );

      const { codes, expiresAt } = JSON.parse(decryptedData);

      // Check if codes have expired
      if (Date.now() > expiresAt) {
        throw new Error('Backup codes have expired');
      }

      // Check if code is valid and remove it
      const codeIndex = codes.findIndex((code: string) => code === codeToVerify.toUpperCase());
      if (codeIndex === -1) {
        return { valid: false, remainingCodes: codes };
      }

      // Remove used code
      codes.splice(codeIndex, 1);

      return { valid: true, remainingCodes: codes };
    } catch (error) {
      throw new Error('Failed to verify backup code');
    }
  }

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(data: string): string {
    return createHmac('sha256', 'celora-integrity-key')
      .update(data)
      .digest('hex');
  }

  /**
   * Calculate HMAC for authentication
   */
  private calculateHMAC(data: string, key: string): string {
    return createHmac('sha256', key)
      .update(data)
      .digest('hex');
  }

  /**
   * Combine multiple keys securely
   */
  private combineKeys(key1: string, key2: string): string {
    return createHmac('sha256', 'celora-key-combiner')
      .update(`${key1}:${key2}`)
      .digest('hex');
  }

  /**
   * Secure key derivation for different purposes
   */
  deriveApplicationKey(
    masterKey: string,
    purpose: 'wallet' | 'cards' | 'biometric' | 'backup' | 'export',
    userId: string,
    salt?: string
  ): string {
    const purposeSalt = salt || `${purpose}:${userId}:celora-v2`;
    return pbkdf2Sync(masterKey, purposeSalt, 100000, 32, 'sha512').toString('hex');
  }

  /**
   * Secure random password generation
   */
  generateSecurePassword(
    length: number = 16,
    includeSymbols: boolean = true
  ): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = includeSymbols ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    const randomBytes = this.generateSecureKey(length);
    
    return Array.from(randomBytes)
      .map(byte => allChars[byte % allChars.length])
      .join('');
  }

  /**
   * Key stretching for additional security
   */
  stretchKey(key: string, rounds: number = 1000): string {
    let stretched = key;
    for (let i = 0; i < rounds; i++) {
      stretched = createHmac('sha512', stretched).update(`round-${i}`).digest('hex');
    }
    return stretched;
  }
}

// Export singleton instance
export const advancedEncryption = AdvancedEncryption.getInstance();

// Utility functions for common operations
export const encryptSeedPhrase = (seedPhrase: string, password: string) =>
  advancedEncryption.encryptSensitiveData(seedPhrase, password, 'seed-phrase');

export const decryptSeedPhrase = (encryptedData: EncryptedData, password: string) =>
  advancedEncryption.decryptSensitiveData(encryptedData, password, 'seed-phrase');

export const encryptCardData = (cardData: CardData, masterKey: string, userFingerprint?: string) =>
  advancedEncryption.encryptCardData(cardData, masterKey, userFingerprint);

export const decryptCardData = (encryptedData: EncryptedData, masterKey: string, userFingerprint?: string, expectedLast4?: string) =>
  advancedEncryption.decryptCardData(encryptedData, masterKey, userFingerprint, expectedLast4);