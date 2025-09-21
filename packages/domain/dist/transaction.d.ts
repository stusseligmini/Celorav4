import { z } from 'zod';
export declare const TransactionType: z.ZodEnum<["purchase", "refund", "fee", "topup", "withdrawal", "adjustment"]>;
export declare const TransactionStatus: z.ZodEnum<["pending", "posted", "reversed"]>;
export declare const DomainTransaction: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    cardId: z.ZodString;
    type: z.ZodEnum<["purchase", "refund", "fee", "topup", "withdrawal", "adjustment"]>;
    amount: z.ZodNumber;
    currency: z.ZodString;
    status: z.ZodEnum<["pending", "posted", "reversed"]>;
    merchantName: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodDate>;
    runningBalance: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    cardId: string;
    type: "purchase" | "refund" | "fee" | "topup" | "withdrawal" | "adjustment";
    amount: number;
    currency: string;
    status: "pending" | "posted" | "reversed";
    createdAt: Date;
    merchantName?: string | undefined;
    metadata?: Record<string, any> | undefined;
    updatedAt?: Date | undefined;
    runningBalance?: number | undefined;
}, {
    id: string;
    userId: string;
    cardId: string;
    type: "purchase" | "refund" | "fee" | "topup" | "withdrawal" | "adjustment";
    amount: number;
    currency: string;
    status: "pending" | "posted" | "reversed";
    createdAt: Date;
    merchantName?: string | undefined;
    metadata?: Record<string, any> | undefined;
    updatedAt?: Date | undefined;
    runningBalance?: number | undefined;
}>;
export type TTransaction = z.infer<typeof DomainTransaction>;
export declare class LedgerDomain {
    /**
     * Compute expected balance given a list of transactions (filters out reversed)
     */
    static computeBalance(transactions: Pick<TTransaction, 'amount' | 'status'>[]): number;
    /**
     * Validate whether a topup is allowed (basic rule set; can expand with AML / limits)
     */
    static validateTopup(cardStatus: string, amount: number): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Reconciliation result type helper
     */
    static reconcile(currentCardBalance: number, transactions: Pick<TTransaction, 'amount' | 'status'>[]): {
        inSync: boolean;
        expected: number;
        delta: number;
    };
}
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
export declare function createAuditEvent(params: Omit<AuditEvent, 'timestamp'>): AuditEvent;
