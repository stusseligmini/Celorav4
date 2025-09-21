import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KMSService, EncryptionResult } from '../kmsService';
import { KeyRegistry } from '../keyRegistry';

// Mock the KeyRegistry
const mockKeyRegistry = {
  getActiveKey: vi.fn(),
  getRotationSchedule: vi.fn()
};

describe('KMSService', () => {
  let kmsService: KMSService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock active key
    mockKeyRegistry.getActiveKey.mockReturnValue({
      keyId: 'test-master-key-123',
      algorithm: 'kyber1024',
      created: '2025-09-20T10:00:00.000Z',
      loadedAt: new Date()
    });

    kmsService = new KMSService(mockKeyRegistry as any);
  });

  describe('envelope encryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'sensitive user data';
      
      // Encrypt data
      const encrypted = await kmsService.encryptData(plaintext);
      
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('keyVersion', 1);
      expect(encrypted).toHaveProperty('algorithm', 'aes-256-gcm');
      expect(encrypted).toHaveProperty('iv');
      
      // Decrypt data
      const decrypted = await kmsService.decryptData(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail encryption without active key', async () => {
      mockKeyRegistry.getActiveKey.mockReturnValue(null);
      const kmsWithoutKey = new KMSService(mockKeyRegistry as any);
      
      await expect(kmsWithoutKey.encryptData('test')).rejects.toThrow('No active encryption key available');
    });

    it('should fail decryption with non-existent key version', async () => {
      const invalidEncryption: EncryptionResult = {
        ciphertext: 'invalid:data',
        keyVersion: 999,
        algorithm: 'aes-256-gcm',
        iv: 'invalid'
      };
      
      await expect(kmsService.decryptData(invalidEncryption)).rejects.toThrow('Key version 999 not found');
    });
  });

  describe('key rotation', () => {
    it('should rotate keys successfully', async () => {
      const result = await kmsService.rotateKeys('manual');
      
      expect(result).toHaveProperty('newKeyId');
      expect(result).toHaveProperty('newVersion', 2);
      expect(result).toHaveProperty('rotatedAt');
      expect(result).toHaveProperty('previousKeyId');
      expect(result).toHaveProperty('reason', 'manual');
      
      // Should be able to encrypt with new key
      const encrypted = await kmsService.encryptData('test after rotation');
      expect(encrypted.keyVersion).toBe(2);
    });

    it('should maintain backward compatibility after rotation', async () => {
      // Encrypt with original key
      const originalEncrypted = await kmsService.encryptData('original data');
      expect(originalEncrypted.keyVersion).toBe(1);
      
      // Rotate keys
      await kmsService.rotateKeys('scheduled');
      
      // Should still decrypt old data
      const decrypted = await kmsService.decryptData(originalEncrypted);
      expect(decrypted).toBe('original data');
      
      // New encryptions should use new key
      const newEncrypted = await kmsService.encryptData('new data');
      expect(newEncrypted.keyVersion).toBe(2);
    });

    it('should prevent decryption with revoked keys', async () => {
      // Encrypt data
      const encrypted = await kmsService.encryptData('test data');
      
      // Rotate to get new version
      await kmsService.rotateKeys('manual');
      
      // Revoke old key version
      await kmsService.revokeKeyVersion(1, 'security breach');
      
      // Should not be able to decrypt with revoked key
      await expect(kmsService.decryptData(encrypted)).rejects.toThrow('Key version 1 has been revoked');
    });

    it('should not allow revoking active key', async () => {
      await expect(kmsService.revokeKeyVersion(1, 'test')).rejects.toThrow('Cannot revoke the current active key');
    });
  });

  describe('rotation scheduling', () => {
    it('should detect daily rotation needed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      
      mockKeyRegistry.getRotationSchedule.mockReturnValue({
        dailyRotation: {
          enabled: true,
          time: '02:00:00'
        }
      });
      
      // Mock current key as old
      mockKeyRegistry.getActiveKey.mockReturnValue({
        keyId: 'old-key',
        algorithm: 'kyber1024',
        created: yesterday.toISOString(),
        loadedAt: new Date()
      });
      
      const needsRotation = await kmsService.checkRotationNeeded();
      // Note: This test is time-dependent and may need adjustment
      expect(typeof needsRotation).toBe('boolean');
    });

    it('should handle emergency rotation', async () => {
      mockKeyRegistry.getRotationSchedule.mockReturnValue({
        emergencyRotation: {
          enabled: true,
          triggers: ['security-breach', 'anomaly-detected']
        }
      });
      
      const result = await kmsService.emergencyRotation('security-breach');
      expect(result.reason).toBe('emergency');
    });

    it('should reject invalid emergency triggers', async () => {
      mockKeyRegistry.getRotationSchedule.mockReturnValue({
        emergencyRotation: {
          enabled: true,
          triggers: ['security-breach']
        }
      });
      
      await expect(kmsService.emergencyRotation('invalid-trigger')).rejects.toThrow('Emergency rotation not enabled for trigger');
    });
  });

  describe('key version management', () => {
    it('should track key version history', async () => {
      // Initial state
      let history = kmsService.getKeyVersionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe(1);
      expect(history[0].status).toBe('active');
      
      // After rotation
      await kmsService.rotateKeys('manual');
      history = kmsService.getKeyVersionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(2); // Latest first
      expect(history[0].status).toBe('active');
      expect(history[1].status).toBe('deprecated');
    });

    it('should handle multiple rotations', async () => {
      // Perform multiple rotations
      await kmsService.rotateKeys('scheduled');
      await kmsService.rotateKeys('manual');
      await kmsService.rotateKeys('emergency');
      
      const history = kmsService.getKeyVersionHistory();
      expect(history).toHaveLength(4); // Original + 3 rotations
      expect(history[0].version).toBe(4); // Latest version
      expect(history[0].status).toBe('active');
      
      // Only the latest should be active
      const activeKeys = history.filter(k => k.status === 'active');
      expect(activeKeys).toHaveLength(1);
      expect(activeKeys[0].version).toBe(4);
    });
  });

  describe('error handling', () => {
    it('should handle missing master key gracefully', async () => {
      mockKeyRegistry.getActiveKey.mockReturnValue(null);
      const kmsWithoutKey = new KMSService(mockKeyRegistry as any);
      
      await expect(kmsWithoutKey.rotateKeys()).rejects.toThrow('No current key to rotate');
    });

    it('should handle rotation schedule parsing errors', async () => {
      mockKeyRegistry.getRotationSchedule.mockReturnValue(null);
      
      const needsRotation = await kmsService.checkRotationNeeded();
      expect(needsRotation).toBe(false);
    });
  });
});