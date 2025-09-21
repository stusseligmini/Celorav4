import { z } from 'zod';

// NOTE: For now we keep amounts as number (floating) to avoid breaking existing code.
// In a future multi-currency task we will move to integer minor units (BigInt) per currency.

export const TransactionType = z.enum([
  'purchase',
  'refund',
  'fee',
  'topup',
  'withdrawal',
  'adjustment'
]);

export const TransactionStatus = z.enum([
  'pending',
  'posted',
  'reversed'
]);

// Rename internal schema symbol to DomainTransaction to avoid name collisions with generated types.
export const DomainTransaction = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  type: TransactionType,
  amount: z.number(), // positive for inflow (topup/refund), negative for outflow (purchase/fee/withdrawal)
  currency: z.string().length(3),
  status: TransactionStatus,
  merchantName: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  runningBalance: z.number().optional()
});

export type TTransaction = z.infer<typeof DomainTransaction>;

export class LedgerDomain {
  /**
   * Compute expected balance given a list of transactions (filters out reversed)
   */
  static computeBalance(transactions: Pick<TTransaction, 'amount' | 'status'>[]): number {
    return transactions
      .filter(t => t.status !== 'reversed')
      .reduce((acc, t) => acc + t.amount, 0);
  }

  /**
   * Validate whether a topup is allowed (basic rule set; can expand with AML / limits)
   */
  static validateTopup(cardStatus: string, amount: number): { valid: boolean; reason?: string } {
    if (cardStatus === 'closed') return { valid: false, reason: 'Card is closed' };
    if (amount <= 0) return { valid: false, reason: 'Amount must be positive' };
    if (amount > 1_000_000) return { valid: false, reason: 'Amount exceeds temporary limit' };
    return { valid: true };
  }

  /**
   * Reconciliation result type helper
   */
  static reconcile(currentCardBalance: number, transactions: Pick<TTransaction,'amount'| 'status'>[]): { inSync: boolean; expected: number; delta: number } {
    const expected = this.computeBalance(transactions);
    const delta = expected - currentCardBalance;
    return { inSync: Math.abs(delta) < 0.00001, expected, delta };
  }
}

// Simple audit event shape for domain layer usage
export interface AuditEvent {
  actorUserId: string;
  entityType: 'card' | 'transaction';
  entityId: string;
  action: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export function createAuditEvent(params: Omit<AuditEvent, 'timestamp'>): AuditEvent {
  return { ...params, timestamp: new Date() };
}
