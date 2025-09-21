"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const infrastructure_1 = require("@celora/infrastructure");
// Mock the supabase client
const mockSupabaseClient = {
    from: vitest_1.vi.fn(),
    auth: {
        getUser: vitest_1.vi.fn()
    }
};
const mockCreateClient = vitest_1.vi.fn(() => mockSupabaseClient);
vitest_1.vi.mock('@supabase/supabase-js', () => ({
    createClient: mockCreateClient
}));
vitest_1.vi.mock('@celora/infrastructure/env', () => ({
    loadEnv: vitest_1.vi.fn(() => ({
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key'
    }))
}));
vitest_1.vi.mock('@celora/infrastructure/logger', () => ({
    logger: {
        error: vitest_1.vi.fn(),
        info: vitest_1.vi.fn()
    }
}));
(0, vitest_1.describe)('SupabaseService - Card Status Operations', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        service = new infrastructure_1.SupabaseService('https://test.supabase.co', 'test-anon-key');
    });
    (0, vitest_1.describe)('updateCardStatus', () => {
        (0, vitest_1.it)('should successfully update card status', async () => {
            const mockUpdate = vitest_1.vi.fn().mockReturnValue({
                eq: vitest_1.vi.fn().mockReturnValue({
                    eq: vitest_1.vi.fn().mockResolvedValue({ error: null })
                })
            });
            mockSupabaseClient.from.mockReturnValue({
                update: mockUpdate
            });
            const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('virtual_cards');
            (0, vitest_1.expect)(mockUpdate).toHaveBeenCalledWith({
                status: 'suspended',
                updated_at: vitest_1.expect.any(Date)
            });
        });
        (0, vitest_1.it)('should return false on database error', async () => {
            const mockUpdate = vitest_1.vi.fn().mockReturnValue({
                eq: vitest_1.vi.fn().mockReturnValue({
                    eq: vitest_1.vi.fn().mockResolvedValue({
                        error: { message: 'Database error' }
                    })
                })
            });
            mockSupabaseClient.from.mockReturnValue({
                update: mockUpdate
            });
            const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should return false on exception', async () => {
            mockSupabaseClient.from.mockImplementation(() => {
                throw new Error('Network error');
            });
            const result = await service.updateCardStatus('card-123', 'user-456', 'suspended');
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getCardRiskScore', () => {
        (0, vitest_1.it)('should return low risk for new cards with no transactions', async () => {
            const mockSelect = vitest_1.vi.fn().mockReturnValue({
                eq: vitest_1.vi.fn().mockReturnValue({
                    gte: vitest_1.vi.fn().mockReturnValue({
                        order: vitest_1.vi.fn().mockResolvedValue({
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
            (0, vitest_1.expect)(riskScore).toBe(0.1);
            (0, vitest_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('transactions');
        });
        (0, vitest_1.it)('should calculate risk based on transaction activity', async () => {
            const mockTransactions = [
                { amount: 100, created_at: new Date().toISOString() },
                { amount: 50, created_at: new Date().toISOString() },
                { amount: 200, created_at: new Date().toISOString() }
            ];
            const mockSelect = vitest_1.vi.fn().mockReturnValue({
                eq: vitest_1.vi.fn().mockReturnValue({
                    gte: vitest_1.vi.fn().mockReturnValue({
                        order: vitest_1.vi.fn().mockResolvedValue({
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
            (0, vitest_1.expect)(riskScore).toBeGreaterThan(0.1);
            (0, vitest_1.expect)(riskScore).toBeLessThanOrEqual(0.95);
        });
        (0, vitest_1.it)('should return fallback risk score on error', async () => {
            const mockSelect = vitest_1.vi.fn().mockReturnValue({
                eq: vitest_1.vi.fn().mockReturnValue({
                    gte: vitest_1.vi.fn().mockReturnValue({
                        order: vitest_1.vi.fn().mockRejectedValue(new Error('Database error'))
                    })
                })
            });
            mockSupabaseClient.from.mockReturnValue({
                select: mockSelect
            });
            const riskScore = await service.getCardRiskScore('card-123', 'user-456');
            (0, vitest_1.expect)(riskScore).toBe(0.5);
        });
    });
});
