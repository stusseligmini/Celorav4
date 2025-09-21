"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualCardDomain = exports.CardOperationResult = exports.VirtualCard = exports.VirtualCardStatus = void 0;
const zod_1 = require("zod");
exports.VirtualCardStatus = zod_1.z.enum(['active', 'suspended', 'closed']);
exports.VirtualCard = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    maskedPan: zod_1.z.string(),
    encryptedPayload: zod_1.z.string(),
    balance: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string().length(3),
    status: exports.VirtualCardStatus,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.CardOperationResult = zod_1.z.object({
    success: zod_1.z.boolean(),
    cardId: zod_1.z.string().uuid(),
    previousStatus: exports.VirtualCardStatus.optional(),
    newStatus: exports.VirtualCardStatus.optional(),
    timestamp: zod_1.z.date(),
    reason: zod_1.z.string().optional()
});
class VirtualCardDomain {
    /**
     * Validates if a card status transition is allowed
     */
    static validateStatusTransition(currentStatus, newStatus) {
        // Business rules for status transitions
        const transitions = {
            'active': ['suspended', 'closed'],
            'suspended': ['active', 'closed'],
            'closed': [] // Closed cards cannot be reactivated
        };
        if (currentStatus === newStatus) {
            return { valid: false, reason: 'Card is already in the requested status' };
        }
        if (!transitions[currentStatus]?.includes(newStatus)) {
            return {
                valid: false,
                reason: `Cannot transition from ${currentStatus} to ${newStatus}`
            };
        }
        return { valid: true };
    }
    /**
     * Creates a card operation result
     */
    static createOperationResult(cardId, success, previousStatus, newStatus, reason) {
        return {
            success,
            cardId,
            previousStatus,
            newStatus,
            timestamp: new Date(),
            reason
        };
    }
    /**
     * Determines if a card can be used for transactions
     */
    static isCardUsable(card) {
        return card.status === 'active' && card.balance > 0;
    }
    /**
     * Calculates risk level based on score
     */
    static getRiskLevel(riskScore) {
        if (riskScore < 0.3)
            return 'low';
        if (riskScore < 0.6)
            return 'medium';
        return 'high';
    }
    /**
     * Validates card operation permissions
     */
    static validateCardOwnership(card, userId) {
        return card.userId === userId;
    }
}
exports.VirtualCardDomain = VirtualCardDomain;
