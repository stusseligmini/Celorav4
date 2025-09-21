"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerDomain = exports.DomainTransaction = exports.TransactionStatus = exports.TransactionType = void 0;
exports.createAuditEvent = createAuditEvent;
const zod_1 = require("zod");
// NOTE: For now we keep amounts as number (floating) to avoid breaking existing code.
// In a future multi-currency task we will move to integer minor units (BigInt) per currency.
exports.TransactionType = zod_1.z.enum([
    'purchase',
    'refund',
    'fee',
    'topup',
    'withdrawal',
    'adjustment'
]);
exports.TransactionStatus = zod_1.z.enum([
    'pending',
    'posted',
    'reversed'
]);
// Rename internal schema symbol to DomainTransaction to avoid name collisions with generated types.
exports.DomainTransaction = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    cardId: zod_1.z.string().uuid(),
    type: exports.TransactionType,
    amount: zod_1.z.number(), // positive for inflow (topup/refund), negative for outflow (purchase/fee/withdrawal)
    currency: zod_1.z.string().length(3),
    status: exports.TransactionStatus,
    merchantName: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional(),
    runningBalance: zod_1.z.number().optional()
});
class LedgerDomain {
    /**
     * Compute expected balance given a list of transactions (filters out reversed)
     */
    static computeBalance(transactions) {
        return transactions
            .filter(t => t.status !== 'reversed')
            .reduce((acc, t) => acc + t.amount, 0);
    }
    /**
     * Validate whether a topup is allowed (basic rule set; can expand with AML / limits)
     */
    static validateTopup(cardStatus, amount) {
        if (cardStatus === 'closed')
            return { valid: false, reason: 'Card is closed' };
        if (amount <= 0)
            return { valid: false, reason: 'Amount must be positive' };
        if (amount > 1_000_000)
            return { valid: false, reason: 'Amount exceeds temporary limit' };
        return { valid: true };
    }
    /**
     * Reconciliation result type helper
     */
    static reconcile(currentCardBalance, transactions) {
        const expected = this.computeBalance(transactions);
        const delta = expected - currentCardBalance;
        return { inSync: Math.abs(delta) < 0.00001, expected, delta };
    }
}
exports.LedgerDomain = LedgerDomain;
function createAuditEvent(params) {
    return { ...params, timestamp: new Date() };
}
