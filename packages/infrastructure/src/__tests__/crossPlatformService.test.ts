import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrossPlatformService, CrossPlatformTransactionError } from '../crossPlatformService';

// Mock SupabaseService properly
vi.mock('../supabaseService', () => ({
  SupabaseService: vi.fn().mockImplementation(() => ({
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    addFunds: vi.fn().mockResolvedValue({ success: true }),
    supabase: {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { id: 'test-id' }, 
              error: null 
            })
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
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
        })
      })
    }
  }))
}));

// Mock CeloraWalletService
vi.mock('../celoraWalletService', () => ({
  CeloraWalletService: vi.fn().mockImplementation(() => ({
    // Mock methods as needed
  }))
}));

describe('CrossPlatformService', () => {
  let service: CrossPlatformService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CrossPlatformService();
  });

  describe('createTopup', () => {
    it('should create a valid topup transaction', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'topup' as const,
        amount: 100,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    it('should reject topup without walletId', async () => {
      const request = {
        userId: 'user-123',
        cardId: 'card-789',
        transactionType: 'topup' as const,
        amount: 100,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('walletId and cardId required');
    });

    it('should reject invalid transaction type', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'cashout' as const,
        amount: 100,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transaction type');
    });
  });

  describe('createCashout', () => {
    it('should create a valid cashout transaction', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'cashout' as const,
        amount: 50,
        sourceCurrency: 'USD',
        targetCurrency: 'SOL'
      };

      const result = await service.createCashout(request);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should reject negative amounts', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'topup' as const,
        amount: -10,
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });

    it('should reject unsupported currencies', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'topup' as const,
        amount: 100,
        sourceCurrency: 'INVALID',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported source currency');
    });

    it('should reject amounts exceeding maximum', async () => {
      const request = {
        userId: 'user-123',
        walletId: 'wallet-456',
        cardId: 'card-789',
        transactionType: 'topup' as const,
        amount: 2000000, // Above 1M limit
        sourceCurrency: 'SOL',
        targetCurrency: 'USD'
      };

      const result = await service.createTopup(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum limit');
    });
  });

  describe('fee calculation', () => {
    it('should calculate fees correctly for different transaction types', () => {
      const service = new CrossPlatformService();
      
      // Access private method for testing
      const calculateFee = (service as any).calculateFee.bind(service);
      
      expect(calculateFee(1000, 'topup')).toBe(5); // 0.5%
      expect(calculateFee(1000, 'cashout')).toBe(10); // 1%
      expect(calculateFee(1000, 'conversion')).toBe(3); // 0.3%
      expect(calculateFee(1000, 'payment')).toBe(2); // 0.2%
    });

    it('should enforce minimum fee', () => {
      const service = new CrossPlatformService();
      const calculateFee = (service as any).calculateFee.bind(service);
      
      // Small amount should still have minimum fee
      expect(calculateFee(1, 'topup')).toBe(0.01);
    });
  });
});