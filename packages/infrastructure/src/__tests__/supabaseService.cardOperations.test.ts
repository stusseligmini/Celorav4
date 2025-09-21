import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseService } from '@celora/infrastructure';

// Mock the supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

const mockCreateClient = vi.fn(() => mockSupabaseClient);

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}));

vi.mock('@celora/infrastructure/env', () => ({
  loadEnv: vi.fn(() => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key'
  }))
}));

vi.mock('@celora/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('SupabaseService - Card Status Operations', () => {
  let service: SupabaseService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupabaseService('https://test.supabase.co', 'test-anon-key');
  });

  describe('updateCardStatus', () => {
    it('should successfully update card status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });
      
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'suspended',
        updated_at: expect.any(Date)
      });
    });

    it('should return false on database error', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ 
            error: { message: 'Database error' }
          })
        })
      });
      
      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate
      });

      const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');

      expect(result).toBe(false);
    });

    it('should return false on exception', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');

      expect(result).toBe(false);
    });
  });

  describe('getCardRiskScore', () => {
    it('should return low risk for new cards with no transactions', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const riskScore = await service.getCardRiskScore('card-123', 'user-456');

      expect(riskScore).toBe(0.1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
    });

    it('should calculate risk based on transaction activity', async () => {
      const mockTransactions = [
        { amount: 100, created_at: new Date().toISOString() },
        { amount: 50, created_at: new Date().toISOString() },
        { amount: 200, created_at: new Date().toISOString() }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTransactions,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const riskScore = await service.getCardRiskScore('card-123', 'user-456');

      expect(riskScore).toBeGreaterThan(0.1);
      expect(riskScore).toBeLessThanOrEqual(0.95);
    });

    it('should return fallback risk score on error', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const riskScore = await service.getCardRiskScore('card-123', 'user-456');

      expect(riskScore).toBe(0.5);
    });
  });
});