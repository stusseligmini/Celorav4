import { z } from 'zod';
export declare const VirtualCardStatus: z.ZodEnum<["active", "suspended", "closed"]>;
export declare const VirtualCard: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    maskedPan: z.ZodString;
    encryptedPayload: z.ZodString;
    balance: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodEnum<["active", "suspended", "closed"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: "active" | "suspended" | "closed";
    userId: string;
    balance: number;
    currency: string;
    maskedPan: string;
    encryptedPayload: string;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: "active" | "suspended" | "closed";
    userId: string;
    balance: number;
    currency: string;
    maskedPan: string;
    encryptedPayload: string;
}>;
export type TVirtualCard = z.infer<typeof VirtualCard>;
export declare const CardOperationResult: z.ZodObject<{
    success: z.ZodBoolean;
    cardId: z.ZodString;
    previousStatus: z.ZodOptional<z.ZodEnum<["active", "suspended", "closed"]>>;
    newStatus: z.ZodOptional<z.ZodEnum<["active", "suspended", "closed"]>>;
    timestamp: z.ZodDate;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cardId: string;
    success: boolean;
    timestamp: Date;
    previousStatus?: "active" | "suspended" | "closed" | undefined;
    newStatus?: "active" | "suspended" | "closed" | undefined;
    reason?: string | undefined;
}, {
    cardId: string;
    success: boolean;
    timestamp: Date;
    previousStatus?: "active" | "suspended" | "closed" | undefined;
    newStatus?: "active" | "suspended" | "closed" | undefined;
    reason?: string | undefined;
}>;
export type TCardOperationResult = z.infer<typeof CardOperationResult>;
export declare class VirtualCardDomain {
    /**
     * Validates if a card status transition is allowed
     */
    static validateStatusTransition(currentStatus: z.infer<typeof VirtualCardStatus>, newStatus: z.infer<typeof VirtualCardStatus>): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Creates a card operation result
     */
    static createOperationResult(cardId: string, success: boolean, previousStatus?: z.infer<typeof VirtualCardStatus>, newStatus?: z.infer<typeof VirtualCardStatus>, reason?: string): TCardOperationResult;
    /**
     * Determines if a card can be used for transactions
     */
    static isCardUsable(card: TVirtualCard): boolean;
    /**
     * Calculates risk level based on score
     */
    static getRiskLevel(riskScore: number): 'low' | 'medium' | 'high';
    /**
     * Validates card operation permissions
     */
    static validateCardOwnership(card: TVirtualCard, userId: string): boolean;
}
