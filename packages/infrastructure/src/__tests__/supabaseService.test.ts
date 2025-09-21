import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseService } from '../supabaseService';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  channel: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupabaseService('http://localhost:54321', 'test-key');
  });

  describe('createVirtualCard', () => {
    it('creates a virtual card with default values', async () => {
      const mockCard = {
        id: 'card-123',
        user_id: 'user-456',
        masked_pan: '**** **** **** 1234',
        balance: 0,
        currency: 'USD',
        status: 'active'
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCard,
        error: null
      });

      const result = await service.createVirtualCard('user-456', {
        masked_pan: '**** **** **** 1234'
      });

      expect(result).toEqual(mockCard);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          masked_pan: '**** **** **** 1234',
          balance: 0,
          currency: 'USD',
          status: 'active'
        })
      );
    });

    it('handles encryption when rawPayload provided', async () => {
      const mockCard = { id: 'card-123', user_id: 'user-456' };
      
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCard,
        error: null
      });

      const result = await service.createVirtualCard('user-456', {
        rawPayload: '{"cardNumber":"4111111111111111","cvv":"123"}',
        encryptionKey: 'user-secret-key'
      });

      expect(result).toEqual(mockCard);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          encrypted_payload: expect.stringContaining('"ciphertext"')
        })
      );
    });

    it('returns null on error', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await service.createVirtualCard('user-456', {});
      expect(result).toBeNull();
    });
  });

  describe('getVirtualCards', () => {
    it('fetches user cards ordered by creation date', async () => {
      const mockCards = [
        { id: 'card-1', user_id: 'user-456', balance: 100 },
        { id: 'card-2', user_id: 'user-456', balance: 50 }
      ];

      mockSupabaseClient.order.mockReturnValueOnce({
        then: (callback: any) => callback({ data: mockCards, error: null })
      });

      const result = await service.getVirtualCards('user-456');

      expect(result).toEqual(mockCards);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('updateCardBalance', () => {
    it('updates balance and timestamp', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({ error: null });

      const result = await service.updateCardBalance('card-123', 150.50);

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          balance: 150.50,
          updated_at: expect.any(Date)
        })
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'card-123');
    });

    it('returns false on update error', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({ 
        error: { message: 'Update failed' } 
      });

      const result = await service.updateCardBalance('card-123', 100);
      expect(result).toBe(false);
    });
  });

  describe('getTransactions', () => {
    it('fetches user transactions with limit', async () => {
      const mockTransactions = [
        { id: 'tx-1', user_id: 'user-456', amount: -25.99 },
        { id: 'tx-2', user_id: 'user-456', amount: 100.00 }
      ];

      mockSupabaseClient.limit.mockReturnValueOnce({
        then: (callback: any) => callback({ data: mockTransactions, error: null })
      });

      const result = await service.getTransactions('user-456', 10);

      expect(result).toEqual(mockTransactions);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('subscribeToCardUpdates', () => {
    it('sets up real-time subscription', () => {
      const callback = vi.fn();
      
      service.subscribeToCardUpdates('user-456', callback);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('virtual_cards');
      expect(mockSupabaseClient.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'virtual_cards',
          filter: 'user_id=eq.user-456'
        }),
        callback
      );
      expect(mockSupabaseClient.subscribe).toHaveBeenCalled();
    });
  });
});