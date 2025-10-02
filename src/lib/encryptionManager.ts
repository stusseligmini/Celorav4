'use client';

/**
 * Advanced Encryption Library for Celora V2
 * 
 * This module provides robust encryption/decryption functionality for sensitive data including:
 * - AES-256-GCM encryption for data at rest
 * - PBKDF2 key derivation for passwords
 * - Secure random key generation
 * - Card data encryption (PCI DSS compliant patterns)
 * - Seed phrase encryption with additional security layers
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256, // 256-bit keys
  ivLength: 12,   // 96-bit IV for GCM
  tagLength: 16,  // 128-bit authentication tag
  saltLength: 16, // 128-bit salt for PBKDF2
  pbkdf2Iterations: 100000, // PBKDF2 iterations (recommended minimum)
};

interface EncryptedData {
  data: string;           // Base64 encoded encrypted data
  iv: string;            // Base64 encoded initialization vector
  tag: string;           // Base64 encoded authentication tag
  salt?: string;         // Base64 encoded salt (for password-derived keys)
  algorithm: string;     // Algorithm used
  keyDerivation?: string; // Key derivation method if applicable
}

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

class EncryptionManager {
  private crypto: Crypto;

  constructor() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      this.crypto = window.crypto;
    } else {
      throw new Error('Web Crypto API not available');
    }
  }

  // =======================================================================
  // Key Generation and Derivation
  // =======================================================================

  /**
   * Generate a cryptographically secure random key
   */
  async generateKey(): Promise<CryptoKey> {
    return await this.crypto.subtle.generateKey(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
  }> {
    // Generate salt if not provided
    if (!salt) {
      salt = this.crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
    }

    // Import password as key material
    const keyMaterial = await this.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    const key = await this.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false, // not extractable for security
      ['encrypt', 'decrypt']
    );

    return { key, salt };
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await this.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  }

  /**
   * Export key to raw format
   */
  async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    return await this.crypto.subtle.exportKey('raw', key);
  }

  /**
   * Import key from raw format
   */
  async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    return await this.crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // =======================================================================
  // Encryption/Decryption Methods
  // =======================================================================

  /**
   * Encrypt data with AES-GCM using provided key
   */
  async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    // Generate random IV
    const iv = this.crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));

    // Encrypt data
    const encryptedBuffer = await this.crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.tagLength * 8, // bits
      },
      key,
      new TextEncoder().encode(data)
    );

    // Extract encrypted data and authentication tag
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedData = encryptedArray.slice(0, -ENCRYPTION_CONFIG.tagLength);
    const tag = encryptedArray.slice(-ENCRYPTION_CONFIG.tagLength);

    return {
      data: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      tag: this.arrayBufferToBase64(tag),
      algorithm: ENCRYPTION_CONFIG.algorithm,
    };
  }

  /**
   * Decrypt data with AES-GCM using provided key
   */
  async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    // Convert base64 strings back to arrays
    const data = this.base64ToArrayBuffer(encryptedData.data);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const tag = this.base64ToArrayBuffer(encryptedData.tag);

    // Combine encrypted data and tag
    const combined = new Uint8Array(data.byteLength + tag.byteLength);
    combined.set(new Uint8Array(data));
    combined.set(new Uint8Array(tag), data.byteLength);

    // Decrypt data
    const decryptedBuffer = await this.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: new Uint8Array(iv),
        tagLength: ENCRYPTION_CONFIG.tagLength * 8, // bits
      },
      key,
      combined
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Encrypt data with password-derived key
   */
  async encryptWithPassword(data: string, password: string): Promise<EncryptedData> {
    const { key, salt } = await this.deriveKeyFromPassword(password);
    const encrypted = await this.encrypt(data, key);

    return {
      ...encrypted,
      salt: this.arrayBufferToBase64(salt),
      keyDerivation: 'PBKDF2',
    };
  }

  /**
   * Decrypt data with password-derived key
   */
  async decryptWithPassword(encryptedData: EncryptedData, password: string): Promise<string> {
    if (!encryptedData.salt) {
      throw new Error('Salt required for password-based decryption');
    }

    const salt = this.base64ToArrayBuffer(encryptedData.salt);
    const { key } = await this.deriveKeyFromPassword(password, new Uint8Array(salt));

    return await this.decrypt(encryptedData, key);
  }

  // =======================================================================
  // Specialized Encryption Methods
  // =======================================================================

  /**
   * Encrypt seed phrase with additional security layers
   */
  async encryptSeedPhrase(seedPhrase: string[], password: string, userId: string): Promise<EncryptedData> {
    // Combine seed phrase into string
    const seedString = seedPhrase.join(' ');

    // Add checksum for integrity verification
    const checksum = await this.calculateChecksum(seedString + userId);
    const dataWithChecksum = JSON.stringify({
      seed: seedString,
      checksum,
      userId,
      timestamp: Date.now(),
    });

    // Encrypt with password
    return await this.encryptWithPassword(dataWithChecksum, password);
  }

  /**
   * Decrypt and verify seed phrase
   */
  async decryptSeedPhrase(encryptedData: EncryptedData, password: string, userId: string): Promise<string[]> {
    // Decrypt data
    const decryptedString = await this.decryptWithPassword(encryptedData, password);
    const data = JSON.parse(decryptedString);

    // Verify checksum
    const expectedChecksum = await this.calculateChecksum(data.seed + userId);
    if (data.checksum !== expectedChecksum) {
      throw new Error('Seed phrase integrity check failed');
    }

    // Verify user ID
    if (data.userId !== userId) {
      throw new Error('Seed phrase does not belong to this user');
    }

    return data.seed.split(' ');
  }

  /**
   * Encrypt card data (PCI DSS compliant approach)
   */
  async encryptCardData(cardData: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    holderName: string;
  }, key: CryptoKey): Promise<{
    encryptedNumber: EncryptedData;
    encryptedExpiry: EncryptedData;
    encryptedCvv: EncryptedData;
    encryptedHolderName: EncryptedData;
    cardFingerprint: string;
  }> {
    // Encrypt each field separately for security
    const encryptedNumber = await this.encrypt(cardData.number, key);
    const encryptedExpiry = await this.encrypt(`${cardData.expiryMonth}/${cardData.expiryYear}`, key);
    const encryptedCvv = await this.encrypt(cardData.cvv, key);
    const encryptedHolderName = await this.encrypt(cardData.holderName, key);

    // Create card fingerprint (non-reversible identifier)
    const cardFingerprint = await this.calculateChecksum(
      cardData.number.slice(-4) + cardData.expiryMonth + cardData.expiryYear
    );

    return {
      encryptedNumber,
      encryptedExpiry,
      encryptedCvv,
      encryptedHolderName,
      cardFingerprint,
    };
  }

  /**
   * Encrypt transaction data
   */
  async encryptTransactionData(transaction: {
    amount: number;
    currency: string;
    recipientId: string;
    description?: string;
    metadata?: Record<string, any>;
  }, key: CryptoKey): Promise<EncryptedData> {
    const transactionString = JSON.stringify({
      ...transaction,
      timestamp: Date.now(),
    });

    return await this.encrypt(transactionString, key);
  }

  // =======================================================================
  // Utility Methods
  // =======================================================================

  /**
   * Calculate SHA-256 checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    const buffer = await this.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return this.arrayBufferToBase64(buffer);
  }

  /**
   * Generate cryptographically secure random string
   */
  generateSecureRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    this.crypto.getRandomValues(array);
    
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    return this.crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Secure string comparison (timing-safe)
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Hash password for storage (using PBKDF2)
   */
  async hashPassword(password: string, salt?: Uint8Array): Promise<{
    hash: string;
    salt: string;
  }> {
    if (!salt) {
      salt = this.crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
    }

    const keyMaterial = await this.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hashBuffer = await this.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256 // 32 bytes
    );

    return {
      hash: this.arrayBufferToBase64(hashBuffer),
      salt: this.arrayBufferToBase64(salt),
    };
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = this.base64ToArrayBuffer(salt);
    const { hash: newHash } = await this.hashPassword(password, new Uint8Array(saltBuffer));
    
    return this.secureCompare(hash, newHash);
  }
}

// Create singleton instance
const encryptionManager = new EncryptionManager();

export default encryptionManager;
export type { EncryptedData, KeyPair };
