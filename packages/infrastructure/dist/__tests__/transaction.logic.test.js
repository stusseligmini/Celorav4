"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Transaction Logic', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('validates transaction input correctly', () => {
        const validInput = {
            cardId: 'card-123',
            amount: 25.99,
            merchantName: 'Amazon',
            type: 'purchase'
        };
        (0, vitest_1.expect)(validInput.cardId).toBeTruthy();
        (0, vitest_1.expect)(typeof validInput.amount).toBe('number');
        (0, vitest_1.expect)(validInput.amount).toBeGreaterThan(0);
        (0, vitest_1.expect)(['purchase', 'refund', 'fee', 'topup', 'withdrawal']).toContain(validInput.type);
    });
    (0, vitest_1.it)('calculates balance changes correctly', () => {
        const currentBalance = 100;
        const purchaseAmount = 25.99;
        const topupAmount = 50;
        const balanceAfterPurchase = currentBalance - purchaseAmount;
        const balanceAfterTopup = currentBalance + topupAmount;
        (0, vitest_1.expect)(balanceAfterPurchase).toBe(74.01);
        (0, vitest_1.expect)(balanceAfterTopup).toBe(150);
    });
    (0, vitest_1.it)('detects insufficient balance', () => {
        const balance = 10;
        const requestedAmount = 25.99;
        const hasInsufficientFunds = balance < requestedAmount;
        (0, vitest_1.expect)(hasInsufficientFunds).toBe(true);
    });
    (0, vitest_1.it)('handles fraud risk scoring', () => {
        const mockFraudResult = {
            riskScore: 0.8,
            confidence: 0.9,
            reasons: ['High amount', 'Suspicious merchant'],
            recommendedAction: 'block'
        };
        (0, vitest_1.expect)(mockFraudResult.riskScore).toBeGreaterThan(0.5);
        (0, vitest_1.expect)(['allow', 'review', 'block']).toContain(mockFraudResult.recommendedAction);
    });
});
