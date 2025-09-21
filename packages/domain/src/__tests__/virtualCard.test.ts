import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualCardDomain, VirtualCardStatus } from '../virtualCard';

describe('VirtualCardDomain', () => {
  describe('validateStatusTransition', () => {
    it('should allow active -> suspended transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('active', 'suspended');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow suspended -> active transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('suspended', 'active');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow active -> closed transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('active', 'closed');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow suspended -> closed transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('suspended', 'closed');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow closed -> active transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('closed', 'active');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot transition from closed to active');
    });

    it('should not allow closed -> suspended transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('closed', 'suspended');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot transition from closed to suspended');
    });

    it('should not allow same status transition', () => {
      const result = VirtualCardDomain.validateStatusTransition('active', 'active');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Card is already in the requested status');
    });
  });

  describe('getRiskLevel', () => {
    it('should return low risk for scores below 0.3', () => {
      expect(VirtualCardDomain.getRiskLevel(0.1)).toBe('low');
      expect(VirtualCardDomain.getRiskLevel(0.29)).toBe('low');
    });

    it('should return medium risk for scores 0.3-0.59', () => {
      expect(VirtualCardDomain.getRiskLevel(0.3)).toBe('medium');
      expect(VirtualCardDomain.getRiskLevel(0.45)).toBe('medium');
      expect(VirtualCardDomain.getRiskLevel(0.59)).toBe('medium');
    });

    it('should return high risk for scores 0.6 and above', () => {
      expect(VirtualCardDomain.getRiskLevel(0.6)).toBe('high');
      expect(VirtualCardDomain.getRiskLevel(0.85)).toBe('high');
      expect(VirtualCardDomain.getRiskLevel(1.0)).toBe('high');
    });
  });

  describe('isCardUsable', () => {
    it('should return true for active card with positive balance', () => {
      const card = {
        id: 'test-id',
        userId: 'user-id',
        maskedPan: '**** **** **** 1234',
        encryptedPayload: 'encrypted',
        balance: 100,
        currency: 'USD',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(VirtualCardDomain.isCardUsable(card)).toBe(true);
    });

    it('should return false for suspended card', () => {
      const card = {
        id: 'test-id',
        userId: 'user-id',
        maskedPan: '**** **** **** 1234',
        encryptedPayload: 'encrypted',
        balance: 100,
        currency: 'USD',
        status: 'suspended' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(VirtualCardDomain.isCardUsable(card)).toBe(false);
    });

    it('should return false for active card with zero balance', () => {
      const card = {
        id: 'test-id',
        userId: 'user-id',
        maskedPan: '**** **** **** 1234',
        encryptedPayload: 'encrypted',
        balance: 0,
        currency: 'USD',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(VirtualCardDomain.isCardUsable(card)).toBe(false);
    });
  });

  describe('validateCardOwnership', () => {
    it('should return true for matching user ID', () => {
      const card = {
        id: 'test-id',
        userId: 'user-123',
        maskedPan: '**** **** **** 1234',
        encryptedPayload: 'encrypted',
        balance: 100,
        currency: 'USD',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(VirtualCardDomain.validateCardOwnership(card, 'user-123')).toBe(true);
    });

    it('should return false for non-matching user ID', () => {
      const card = {
        id: 'test-id',
        userId: 'user-123',
        maskedPan: '**** **** **** 1234',
        encryptedPayload: 'encrypted',
        balance: 100,
        currency: 'USD',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(VirtualCardDomain.validateCardOwnership(card, 'user-456')).toBe(false);
    });
  });

  describe('createOperationResult', () => {
    it('should create operation result with all fields', () => {
      const result = VirtualCardDomain.createOperationResult(
        'card-123',
        true,
        'active',
        'suspended',
        'User requested freeze'
      );

      expect(result.success).toBe(true);
      expect(result.cardId).toBe('card-123');
      expect(result.previousStatus).toBe('active');
      expect(result.newStatus).toBe('suspended');
      expect(result.reason).toBe('User requested freeze');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should create operation result with minimal fields', () => {
      const result = VirtualCardDomain.createOperationResult('card-456', false);

      expect(result.success).toBe(false);
      expect(result.cardId).toBe('card-456');
      expect(result.previousStatus).toBeUndefined();
      expect(result.newStatus).toBeUndefined();
      expect(result.reason).toBeUndefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});