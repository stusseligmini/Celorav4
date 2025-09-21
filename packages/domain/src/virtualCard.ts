import { z } from 'zod';

export const VirtualCardStatus = z.enum(['active', 'suspended', 'closed']);

export const VirtualCard = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  maskedPan: z.string(),
  encryptedPayload: z.string(),
  balance: z.number().nonnegative(),
  currency: z.string().length(3),
  status: VirtualCardStatus,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TVirtualCard = z.infer<typeof VirtualCard>;

export const CardOperationResult = z.object({
  success: z.boolean(),
  cardId: z.string().uuid(),
  previousStatus: VirtualCardStatus.optional(),
  newStatus: VirtualCardStatus.optional(),
  timestamp: z.date(),
  reason: z.string().optional()
});

export type TCardOperationResult = z.infer<typeof CardOperationResult>;

export class VirtualCardDomain {
  /**
   * Validates if a card status transition is allowed
   */
  static validateStatusTransition(
    currentStatus: z.infer<typeof VirtualCardStatus>,
    newStatus: z.infer<typeof VirtualCardStatus>
  ): { valid: boolean; reason?: string } {
    // Business rules for status transitions
    const transitions: Record<string, string[]> = {
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
  static createOperationResult(
    cardId: string,
    success: boolean,
    previousStatus?: z.infer<typeof VirtualCardStatus>,
    newStatus?: z.infer<typeof VirtualCardStatus>,
    reason?: string
  ): TCardOperationResult {
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
  static isCardUsable(card: TVirtualCard): boolean {
    return card.status === 'active' && card.balance > 0;
  }

  /**
   * Calculates risk level based on score
   */
  static getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.6) return 'medium';
    return 'high';
  }

  /**
   * Validates card operation permissions
   */
  static validateCardOwnership(card: TVirtualCard, userId: string): boolean {
    return card.userId === userId;
  }
}
