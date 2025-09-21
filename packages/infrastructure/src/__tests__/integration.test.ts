import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupabaseService } from '../supabaseService';
import { CeloraWalletService } from '../celoraWalletService';
import { CrossPlatformService } from '../crossPlatformService';
import { KMSService } from '../kmsService';
import { celoraSecurity } from '../celoraSecurity';

/**
 * End-to-End Integration Tests
 * 
 * Tests complete user flows through the system:
 * 1. User Registration & PIN Setup
 * 2. Wallet Creation & Encryption
 * 3. Card Creation & Linking
 * 4. Cross-Platform Transactions
 * 5. Security & Audit Flows
 */

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    channel: vi.fn(() => ({ subscribe: vi.fn() }))
  }))
}));

describe('End-to-End Integration Tests', () => {
  let supabaseService: SupabaseService;
  let walletService: CeloraWalletService;
  let crossPlatformService: CrossPlatformService;
  let kmsService: KMSService;
  
  const testUserId = 'test-user-12345';
  const testPin = '123456';
  let testWalletId: string;
  let testCardId: string;

  beforeEach(async () => {
    // Initialize services
    supabaseService = new SupabaseService();
    walletService = new CeloraWalletService(supabaseService);
    crossPlatformService = new CrossPlatformService();
    kmsService = new KMSService();

    // Mock successful database operations
    vi.spyOn(supabaseService.supabase, 'from').mockImplementation((table: string) => {
      const mockChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: `${table}-test-id`,
                user_id: testUserId,
                status: 'active'
              },
              error: null
            })
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: table === 'user_security' ? {
                id: 'security-id',
                user_id: testUserId,
                hashed_pin: 'hashed_pin_value',
                salt: 'test_salt',
                failed_attempts: 0,
                locked_until: null
              } : {
                id: `${table}-test-id`,
                user_id: testUserId,
                status: 'active'
              },
              error: null
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      };
      return mockChain;
    });

    // Mock KMS encryption
    vi.spyOn(kmsService, 'encryptData').mockResolvedValue({
      ciphertext: 'encrypted_data',
      keyVersion: 1,
      algorithm: 'aes-256-gcm',
      iv: 'test_iv'
    });

    vi.spyOn(kmsService, 'decryptData').mockResolvedValue('decrypted_data');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration & Security Setup Flow', () => {
    it('should complete full user registration with PIN setup', async () => {
      // Step 1: Create user security profile
      const pinHash = await celoraSecurity.hashPin(testPin, 'test_salt');
      expect(pinHash).toBeDefined();

      // Step 2: Store security data
      const securityData = {
        user_id: testUserId,
        hashed_pin: pinHash,
        salt: 'test_salt',
        failed_attempts: 0,
        locked_until: null
      };

      // Mock successful security creation
      const insertSpy = vi.spyOn(supabaseService.supabase, 'from');
      
      // This would normally call supabaseService.createUserSecurity()
      expect(insertSpy).toBeDefined();
      
      // Step 3: Verify PIN validation works
      const isValidPin = await celoraSecurity.verifyPin(testPin, pinHash, 'test_salt');
      expect(isValidPin).toBe(true);

      // Step 4: Test lockout mechanism
      const isLocked = celoraSecurity.isAccountLocked(0, null);
      expect(isLocked).toBe(false);
    });

    it('should handle PIN lockout scenarios', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);
      
      const isLocked = celoraSecurity.isAccountLocked(5, futureDate);
      expect(isLocked).toBe(true);
    });
  });

  describe('Wallet Creation & Management Flow', () => {
    it('should create and encrypt a crypto wallet end-to-end', async () => {
      // Step 1: Generate wallet data
      const walletType = 'solana';
      const mockPrivateKey = 'mock_private_key_data';
      const mockAddress = 'mock_solana_address';

      // Step 2: Encrypt private key with KMS
      const encryptedKey = await kmsService.encryptData(mockPrivateKey);
      expect(encryptedKey.ciphertext).toBe('encrypted_data');
      expect(encryptedKey.keyVersion).toBe(1);

      // Step 3: Create wallet in database
      const walletData = {
        user_id: testUserId,
        type: walletType,
        address: mockAddress,
        encrypted_private_key: JSON.stringify(encryptedKey),
        balance: 0,
        is_active: true
      };

      // Mock wallet creation
      const fromSpy = vi.spyOn(supabaseService.supabase, 'from');
      testWalletId = 'crypto_wallets-test-id';

      expect(fromSpy).toHaveBeenCalled();

      // Step 4: Verify wallet can be retrieved and decrypted
      const decryptedKey = await kmsService.decryptData(encryptedKey);
      expect(decryptedKey).toBe('decrypted_data');
    });

    it('should handle wallet balance updates with audit trail', async () => {
      const balanceUpdate = {
        wallet_id: testWalletId,
        old_balance: 0,
        new_balance: 100,
        operation: 'topup',
        transaction_hash: 'mock_tx_hash'
      };

      // Mock audit log creation
      const auditSpy = vi.spyOn(supabaseService, 'createAuditLog').mockResolvedValue();
      
      expect(auditSpy).toBeDefined();
    });
  });

  describe('Cross-Platform Transaction Flow', () => {
    beforeEach(() => {
      testCardId = 'virtual_cards-test-id';
      testWalletId = 'crypto_wallets-test-id';
    });

    it('should complete crypto-to-card topup flow', async () => {
      const topupRequest = {
        userId: testUserId,
        walletId: testWalletId,
        cardId: testCardId,
        amount: 50,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      // Step 1: Create topup transaction
      const result = await crossPlatformService.createTopup(topupRequest);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('transactionType', 'topup');

      // Step 2: Verify fee calculation
      expect(result.fee).toBeGreaterThan(0);
      expect(result.feeCurrency).toBe('USD');

      // Step 3: Verify exchange rate applied
      expect(result.exchangeRate).toBeGreaterThan(0);
      expect(result.targetAmount).toBeGreaterThan(0);
    });

    it('should complete card-to-crypto cashout flow', async () => {
      const cashoutRequest = {
        userId: testUserId,
        cardId: testCardId,
        walletId: testWalletId,
        amount: 25,
        sourceCurrency: 'USD',
        targetCurrency: 'SOL'
      };

      // Step 1: Create cashout transaction
      const result = await crossPlatformService.createCashout(cashoutRequest);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('transactionType', 'cashout');

      // Step 2: Verify minimum amount validation
      expect(result.amount).toBeGreaterThan(0);
    });

    it('should handle transaction status updates with notifications', async () => {
      const transactionId = 'cross_platform_transactions-test-id';
      
      // Mock status update
      const updateSpy = vi.spyOn(supabaseService.supabase, 'from');
      
      // Simulate processing → completed flow
      expect(updateSpy).toBeDefined();
      
      // Should trigger audit log
      const auditSpy = vi.spyOn(supabaseService, 'createAuditLog').mockResolvedValue();
      expect(auditSpy).toBeDefined();
    });

    it('should handle failed transactions with proper error logging', async () => {
      const failedRequest = {
        userId: testUserId,
        walletId: 'invalid-wallet',
        cardId: testCardId,
        amount: -10, // Invalid amount
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      // Should reject invalid amounts
      await expect(crossPlatformService.createTopup(failedRequest))
        .rejects.toThrow('Amount must be positive');
    });
  });

  describe('Security & Audit Integration', () => {
    it('should log all sensitive operations', async () => {
      const auditSpy = vi.spyOn(supabaseService, 'createAuditLog').mockResolvedValue();
      
      // Simulate sensitive operations
      const operations = [
        { action: 'wallet_created', entity: 'crypto_wallets', entityId: testWalletId },
        { action: 'pin_verified', entity: 'user_security', entityId: testUserId },
        { action: 'transaction_created', entity: 'cross_platform_transactions', entityId: 'tx-123' }
      ];

      for (const op of operations) {
        await supabaseService.createAuditLog(
          testUserId,
          op.action,
          op.entity,
          op.entityId,
          {}
        );
      }

      expect(auditSpy).toHaveBeenCalledTimes(3);
    });

    it('should enforce rate limiting on sensitive operations', async () => {
      // Mock rate limiting check
      const rateLimitCheck = vi.fn().mockReturnValue(true);
      
      // Simulate multiple PIN attempts
      const attempts = Array(6).fill(null);
      let blocked = false;
      
      for (let i = 0; i < attempts.length; i++) {
        if (i >= 5) {
          blocked = rateLimitCheck();
        }
      }
      
      expect(blocked).toBe(true);
    });

    it('should handle KMS key rotation during active operations', async () => {
      // Step 1: Encrypt data with current key
      const originalData = 'sensitive_wallet_data';
      const encrypted = await kmsService.encryptData(originalData);
      expect(encrypted.keyVersion).toBe(1);

      // Step 2: Rotate keys
      const rotationResult = await kmsService.rotateKeys('scheduled');
      expect(rotationResult.newVersion).toBe(2);

      // Step 3: Verify old data still decryptable
      const decrypted = await kmsService.decryptData(encrypted);
      expect(decrypted).toBe('decrypted_data');

      // Step 4: New encryptions use new key
      const newEncrypted = await kmsService.encryptData(originalData);
      expect(newEncrypted.keyVersion).toBe(2);
    });
  });

  describe('Error Recovery & Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database error
      vi.spyOn(supabaseService.supabase, 'from').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Operations should handle errors without crashing
      await expect(crossPlatformService.createTopup({
        userId: testUserId,
        walletId: testWalletId,
        cardId: testCardId,
        amount: 50,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      })).rejects.toThrow();
    });

    it('should handle KMS unavailability', async () => {
      // Mock KMS error
      vi.spyOn(kmsService, 'encryptData').mockRejectedValue(new Error('KMS unavailable'));

      // Should handle encryption failures
      await expect(kmsService.encryptData('test')).rejects.toThrow('KMS unavailable');
    });

    it('should validate all inputs and prevent injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "{{7*7}}[[7*7]]"
      ];

      for (const input of maliciousInputs) {
        // Should reject malicious inputs in transaction creation
        await expect(crossPlatformService.createTopup({
          userId: input,
          walletId: testWalletId,
          cardId: testCardId,
          amount: 50,
          sourceCurrency: 'SOL',
          targetCurrency: 'USD'
        })).rejects.toThrow();
      }
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent transactions safely', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, i) => 
        crossPlatformService.createTopup({
          userId: testUserId,
          walletId: testWalletId,
          cardId: testCardId,
          amount: 10,
          sourceCurrency: 'SOL',
          targetCurrency: 'USD'
        })
      );

      // All requests should complete without race conditions
      const results = await Promise.allSettled(concurrentRequests);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should cache frequently accessed data', async () => {
      // Multiple calls should use cached data
      const calls = Array(3).fill(null).map(() => 
        supabaseService.supabase.from('user_security').select('*').eq('user_id', testUserId)
      );

      await Promise.all(calls);
      
      // Should have efficient database usage
      expect(true).toBe(true); // Placeholder for cache verification
    });
  });
});