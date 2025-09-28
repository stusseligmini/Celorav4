/**
 * Key Rotation and Management Service
 * 
 * This module handles secure key rotation for encryption keys, API keys,
 * and other sensitive credentials used in the application.
 * 
 * Regular key rotation is a security best practice that limits the exposure
 * window if a key is compromised.
 */

import { createHash, randomBytes } from 'crypto';
import { getCorrelationId, logSecurity } from './logger';
import { createClient } from '@supabase/supabase-js';

// Key types supported by the rotation system
export enum KeyType {
  ENCRYPTION_KEY = 'encryption_key',
  JWT_SECRET = 'jwt_secret',
  API_KEY = 'api_key',
  WEBHOOK_SECRET = 'webhook_secret',
}

// Key state
export enum KeyState {
  ACTIVE = 'active',
  RETIRING = 'retiring',
  RETIRED = 'retired',
}

// Interface for key metadata
interface KeyMetadata {
  id: string;
  version: number;
  createdAt: Date;
  expiresAt: Date | null;
  keyType: KeyType;
  state: KeyState;
  description: string;
}

/**
 * Generates a cryptographically secure random key
 */
export function generateSecureKey(length = 32): string {
  return randomBytes(length).toString('base64');
}

/**
 * Creates a key fingerprint (hash) for identifying a key without exposing it
 */
export function createKeyFingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Manages key rotation and securely stores keys in the database
 */
export class KeyRotationManager {
  private supabaseAdmin: any;
  private keyCache: Map<string, { key: string, metadata: KeyMetadata }> = new Map();
  
  constructor() {
    // Initialize Supabase admin client for key management
    this.supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  
  /**
   * Creates a new key and stores it securely
   */
  public async createKey(
    keyType: KeyType,
    description: string,
    expiryDays = 90 // Default expiry of 90 days
  ): Promise<{ keyId: string, key: string }> {
    const key = generateSecureKey();
    const fingerprint = createKeyFingerprint(key);
    const keyId = `key_${randomBytes(8).toString('hex')}`;
    const now = new Date();
    const expiresAt = expiryDays > 0 ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null;
    
    // Store key metadata and encrypted key in database
    const { error } = await this.supabaseAdmin
      .from('security_keys')
      .insert({
        id: keyId,
        key_type: keyType,
        fingerprint,
        encrypted_key: this.encryptKey(key), // Encrypt before storing
        version: 1,
        created_at: now.toISOString(),
        expires_at: expiresAt?.toISOString() || null,
        state: KeyState.ACTIVE,
        description,
      });
      
    if (error) {
      logSecurity('Failed to store new security key', {
        correlationId: getCorrelationId(),
        action: 'create_key',
        componentName: 'KeyRotationManager',
      }, { keyType, error: error.message });
      
      throw new Error(`Failed to create key: ${error.message}`);
    }
    
    logSecurity('Created new security key', {
      correlationId: getCorrelationId(),
      action: 'create_key',
      componentName: 'KeyRotationManager',
    }, { keyId, keyType, expiresAt });
    
    return { keyId, key };
  }
  
  /**
   * Rotates an existing key, creating a new version and retiring the old one
   */
  public async rotateKey(keyId: string): Promise<{ keyId: string, key: string }> {
    // Get current key information
    const { data: keyData, error } = await this.supabaseAdmin
      .from('security_keys')
      .select('*')
      .eq('id', keyId)
      .single();
      
    if (error || !keyData) {
      logSecurity('Failed to find key for rotation', {
        correlationId: getCorrelationId(),
        action: 'rotate_key',
        componentName: 'KeyRotationManager',
      }, { keyId, error: error?.message });
      
      throw new Error('Key not found for rotation');
    }
    
    // Mark current key as retiring
    await this.supabaseAdmin
      .from('security_keys')
      .update({ state: KeyState.RETIRING })
      .eq('id', keyId);
      
    // Create new key with same properties but new value
    const result = await this.createKey(
      keyData.key_type as KeyType,
      `${keyData.description} (rotated)`,
      keyData.expires_at ? 
        Math.ceil((new Date(keyData.expires_at).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) :
        90 // Default to 90 days if no expiry
    );
    
    // Clear cache to ensure latest keys are fetched
    this.keyCache.clear();
    
    logSecurity('Rotated security key', {
      correlationId: getCorrelationId(),
      action: 'rotate_key',
      componentName: 'KeyRotationManager',
    }, { 
      oldKeyId: keyId, 
      newKeyId: result.keyId,
      keyType: keyData.key_type
    });
    
    return result;
  }
  
  /**
   * Gets the current active key for a given key type
   */
  public async getActiveKey(keyType: KeyType): Promise<{ keyId: string, key: string }> {
    // Check cache first
    const cacheKey = `active_${keyType}`;
    if (this.keyCache.has(cacheKey)) {
      const cached = this.keyCache.get(cacheKey)!;
      return { keyId: cached.metadata.id, key: cached.key };
    }
    
    // Get active key from database
    const { data: keyData, error } = await this.supabaseAdmin
      .from('security_keys')
      .select('*')
      .eq('key_type', keyType)
      .eq('state', KeyState.ACTIVE)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !keyData) {
      logSecurity('No active key found', {
        correlationId: getCorrelationId(),
        action: 'get_active_key',
        componentName: 'KeyRotationManager',
      }, { keyType, error: error?.message });
      
      throw new Error(`No active key found for type ${keyType}`);
    }
    
    // Decrypt key
    const key = this.decryptKey(keyData.encrypted_key);
    
    // Cache for future use
    this.keyCache.set(cacheKey, {
      key,
      metadata: {
        id: keyData.id,
        version: keyData.version,
        createdAt: new Date(keyData.created_at),
        expiresAt: keyData.expires_at ? new Date(keyData.expires_at) : null,
        keyType: keyData.key_type as KeyType,
        state: keyData.state as KeyState,
        description: keyData.description
      }
    });
    
    return { keyId: keyData.id, key };
  }
  
  /**
   * Gets a specific key by ID, useful during transition periods
   */
  public async getKey(keyId: string): Promise<{ key: string, metadata: KeyMetadata }> {
    // Check cache first
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId)!;
    }
    
    // Get key from database
    const { data: keyData, error } = await this.supabaseAdmin
      .from('security_keys')
      .select('*')
      .eq('id', keyId)
      .single();
      
    if (error || !keyData) {
      logSecurity('Key not found', {
        correlationId: getCorrelationId(),
        action: 'get_key',
        componentName: 'KeyRotationManager',
      }, { keyId, error: error?.message });
      
      throw new Error(`Key ${keyId} not found`);
    }
    
    // Decrypt key
    const key = this.decryptKey(keyData.encrypted_key);
    
    // Create metadata
    const metadata: KeyMetadata = {
      id: keyData.id,
      version: keyData.version,
      createdAt: new Date(keyData.created_at),
      expiresAt: keyData.expires_at ? new Date(keyData.expires_at) : null,
      keyType: keyData.key_type as KeyType,
      state: keyData.state as KeyState,
      description: keyData.description
    };
    
    // Cache for future use
    this.keyCache.set(keyId, { key, metadata });
    
    return { key, metadata };
  }
  
  /**
   * Retires a key when it's no longer needed
   */
  public async retireKey(keyId: string): Promise<void> {
    // Update key state in database
    const { error } = await this.supabaseAdmin
      .from('security_keys')
      .update({ state: KeyState.RETIRED })
      .eq('id', keyId);
      
    if (error) {
      logSecurity('Failed to retire key', {
        correlationId: getCorrelationId(),
        action: 'retire_key',
        componentName: 'KeyRotationManager',
      }, { keyId, error: error.message });
      
      throw new Error(`Failed to retire key: ${error.message}`);
    }
    
    // Remove from cache
    this.keyCache.delete(keyId);
    this.keyCache.delete(`active_${keyId.split('_')[0]}`);
    
    logSecurity('Retired security key', {
      correlationId: getCorrelationId(),
      action: 'retire_key',
      componentName: 'KeyRotationManager',
    }, { keyId });
  }
  
  /**
   * Checks for and handles expired keys
   */
  public async checkExpiredKeys(): Promise<void> {
    const now = new Date();
    
    // Get expired keys that are not yet retired
    const { data: expiredKeys, error } = await this.supabaseAdmin
      .from('security_keys')
      .select('id, key_type, expires_at')
      .lt('expires_at', now.toISOString())
      .neq('state', KeyState.RETIRED);
      
    if (error) {
      logSecurity('Failed to check for expired keys', {
        correlationId: getCorrelationId(),
        action: 'check_expired_keys',
        componentName: 'KeyRotationManager',
      }, { error: error.message });
      
      return;
    }
    
    // Handle each expired key
    for (const key of expiredKeys) {
      try {
        // Only rotate keys that are currently active
        if (key.state === KeyState.ACTIVE) {
          await this.rotateKey(key.id);
        } else {
          await this.retireKey(key.id);
        }
      } catch (err: any) {
        logSecurity('Failed to handle expired key', {
          correlationId: getCorrelationId(),
          action: 'handle_expired_key',
          componentName: 'KeyRotationManager',
        }, { 
          keyId: key.id, 
          keyType: key.key_type,
          error: err.message
        });
      }
    }
    
    if (expiredKeys.length > 0) {
      logSecurity('Processed expired keys', {
        correlationId: getCorrelationId(),
        action: 'check_expired_keys',
        componentName: 'KeyRotationManager',
      }, { 
        expiredCount: expiredKeys.length,
        keyIds: expiredKeys.map((k: { id: string }) => k.id)
      });
    }
  }
  
  /**
   * Encrypts a key for secure storage
   * Uses a master key stored in environment variables or HSM
   */
  private encryptKey(key: string): string {
    // In production, replace with proper encryption using HSM or KMS
    // This is a placeholder implementation
    const crypto = require('crypto');
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-replace-in-production';
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      crypto.createHash('sha256').update(masterKey).digest(),
      iv
    );
    
    let encrypted = cipher.update(key, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    
    // Store IV and auth tag with the encrypted data
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }
  
  /**
   * Decrypts a stored key
   */
  private decryptKey(encryptedKey: string): string {
    // In production, replace with proper decryption using HSM or KMS
    // This is a placeholder implementation
    const crypto = require('crypto');
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-replace-in-production';
    
    const [ivBase64, authTagBase64, encryptedData] = encryptedKey.split(':');
    
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      crypto.createHash('sha256').update(masterKey).digest(),
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Singleton instance
let keyRotationManagerInstance: KeyRotationManager;

/**
 * Gets the singleton instance of the key rotation manager
 */
export function getKeyRotationManager(): KeyRotationManager {
  if (!keyRotationManagerInstance) {
    keyRotationManagerInstance = new KeyRotationManager();
  }
  
  return keyRotationManagerInstance;
}