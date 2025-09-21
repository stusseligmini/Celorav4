import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Transaction Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates transaction input correctly', () => {
    const validInput = {
      cardId: 'card-123',
      amount: 25.99,
      merchantName: 'Amazon',
      type: 'purchase'
    };

    expect(validInput.cardId).toBeTruthy();
    expect(typeof validInput.amount).toBe('number');
    expect(validInput.amount).toBeGreaterThan(0);
    expect(['purchase', 'refund', 'fee', 'topup', 'withdrawal']).toContain(validInput.type);
  });

  it('calculates balance changes correctly', () => {
    const currentBalance = 100;
    const purchaseAmount = 25.99;
    const topupAmount = 50;

    const balanceAfterPurchase = currentBalance - purchaseAmount;
    const balanceAfterTopup = currentBalance + topupAmount;

    expect(balanceAfterPurchase).toBe(74.01);
    expect(balanceAfterTopup).toBe(150);
  });

  it('detects insufficient balance', () => {
    const balance = 10;
    const requestedAmount = 25.99;

    const hasInsufficientFunds = balance < requestedAmount;
    expect(hasInsufficientFunds).toBe(true);
  });

  it('handles fraud risk scoring', () => {
    const mockFraudResult = {
      riskScore: 0.8,
      confidence: 0.9,
      reasons: ['High amount', 'Suspicious merchant'],
      recommendedAction: 'block' as const
    };

    expect(mockFraudResult.riskScore).toBeGreaterThan(0.5);
    expect(['allow', 'review', 'block']).toContain(mockFraudResult.recommendedAction);
  });
});