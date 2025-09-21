"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supabaseService_1 = require("../supabaseService");
// Mock Supabase client
const mockSupabaseClient = {
    from: vitest_1.vi.fn().mockReturnThis(),
    insert: vitest_1.vi.fn().mockReturnThis(),
    select: vitest_1.vi.fn().mockReturnThis(),
    eq: vitest_1.vi.fn().mockReturnThis(),
    single: vitest_1.vi.fn(),
    order: vitest_1.vi.fn().mockReturnThis(),
    limit: vitest_1.vi.fn().mockReturnThis(),
    update: vitest_1.vi.fn().mockReturnThis(),
    channel: vitest_1.vi.fn().mockReturnThis(),
    on: vitest_1.vi.fn().mockReturnThis(),
    subscribe: vitest_1.vi.fn()
};
vitest_1.vi.mock('@supabase/supabase-js', () => ({
    createClient: vitest_1.vi.fn(() => mockSupabaseClient)
}));
(0, vitest_1.describe)('SupabaseService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        service = new supabaseService_1.SupabaseService('http://localhost:54321', 'test-key');
    });
    (0, vitest_1.describe)('createVirtualCard', () => {
        (0, vitest_1.it)('creates a virtual card with default values', async () => {
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
            (0, vitest_1.expect)(result).toEqual(mockCard);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
            (0, vitest_1.expect)(mockSupabaseClient.insert).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                user_id: 'user-456',
                masked_pan: '**** **** **** 1234',
                balance: 0,
                currency: 'USD',
                status: 'active'
            }));
        });
        (0, vitest_1.it)('handles encryption when rawPayload provided', async () => {
            const mockCard = { id: 'card-123', user_id: 'user-456' };
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: mockCard,
                error: null
            });
            const result = await service.createVirtualCard('user-456', {
                rawPayload: '{"cardNumber":"4111111111111111","cvv":"123"}',
                encryptionKey: 'user-secret-key'
            });
            (0, vitest_1.expect)(result).toEqual(mockCard);
            (0, vitest_1.expect)(mockSupabaseClient.insert).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                encrypted_payload: vitest_1.expect.stringContaining('"ciphertext"')
            }));
        });
        (0, vitest_1.it)('returns null on error', async () => {
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            });
            const result = await service.createVirtualCard('user-456', {});
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('getVirtualCards', () => {
        (0, vitest_1.it)('fetches user cards ordered by creation date', async () => {
            const mockCards = [
                { id: 'card-1', user_id: 'user-456', balance: 100 },
                { id: 'card-2', user_id: 'user-456', balance: 50 }
            ];
            mockSupabaseClient.order.mockReturnValueOnce({
                then: (callback) => callback({ data: mockCards, error: null })
            });
            const result = await service.getVirtualCards('user-456');
            (0, vitest_1.expect)(result).toEqual(mockCards);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
            (0, vitest_1.expect)(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-456');
            (0, vitest_1.expect)(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
        });
    });
    (0, vitest_1.describe)('updateCardBalance', () => {
        (0, vitest_1.it)('updates balance and timestamp', async () => {
            mockSupabaseClient.eq.mockResolvedValueOnce({ error: null });
            const result = await service.updateCardBalance('card-123', 150.50);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
            (0, vitest_1.expect)(mockSupabaseClient.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                balance: 150.50,
                updated_at: vitest_1.expect.any(Date)
            }));
            (0, vitest_1.expect)(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'card-123');
        });
        (0, vitest_1.it)('returns false on update error', async () => {
            mockSupabaseClient.eq.mockResolvedValueOnce({
                error: { message: 'Update failed' }
            });
            const result = await service.updateCardBalance('card-123', 100);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getTransactions', () => {
        (0, vitest_1.it)('fetches user transactions with limit', async () => {
            const mockTransactions = [
                { id: 'tx-1', user_id: 'user-456', amount: -25.99 },
                { id: 'tx-2', user_id: 'user-456', amount: 100.00 }
            ];
            mockSupabaseClient.limit.mockReturnValueOnce({
                then: (callback) => callback({ data: mockTransactions, error: null })
            });
            const result = await service.getTransactions('user-456', 10);
            (0, vitest_1.expect)(result).toEqual(mockTransactions);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
            (0, vitest_1.expect)(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-456');
            (0, vitest_1.expect)(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
        });
    });
    (0, vitest_1.describe)('subscribeToCardUpdates', () => {
        (0, vitest_1.it)('sets up real-time subscription', () => {
            const callback = vitest_1.vi.fn();
            service.subscribeToCardUpdates('user-456', callback);
            (0, vitest_1.expect)(mockSupabaseClient.channel).toHaveBeenCalledWith('virtual_cards');
            (0, vitest_1.expect)(mockSupabaseClient.on).toHaveBeenCalledWith('postgres_changes', vitest_1.expect.objectContaining({
                event: '*',
                schema: 'public',
                table: 'virtual_cards',
                filter: 'user_id=eq.user-456'
            }), callback);
            (0, vitest_1.expect)(mockSupabaseClient.subscribe).toHaveBeenCalled();
        });
    });
});
