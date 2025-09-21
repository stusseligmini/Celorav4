import { z } from 'zod';
export declare const User: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    username: string;
    createdAt: Date;
    email?: string | undefined;
    updatedAt?: Date | undefined;
}, {
    id: string;
    username: string;
    createdAt: Date;
    email?: string | undefined;
    updatedAt?: Date | undefined;
}>;
export declare const Wallet: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    address: z.ZodString;
    blockchain: z.ZodEnum<["solana", "ethereum"]>;
    balance: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    userId: string;
    address: string;
    blockchain: "solana" | "ethereum";
    balance: number;
    updatedAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    userId: string;
    address: string;
    blockchain: "solana" | "ethereum";
    updatedAt?: Date | undefined;
    balance?: number | undefined;
}>;
export declare const Transaction: z.ZodObject<{
    id: z.ZodString;
    walletId: z.ZodString;
    type: z.ZodEnum<["send", "receive", "funding"]>;
    amount: z.ZodNumber;
    currency: z.ZodString;
    fromAddress: z.ZodOptional<z.ZodString>;
    toAddress: z.ZodOptional<z.ZodString>;
    txHash: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "confirmed", "failed"]>;
    createdAt: z.ZodDate;
    confirmedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    type: "send" | "receive" | "funding";
    status: "pending" | "confirmed" | "failed";
    walletId: string;
    amount: number;
    currency: string;
    fromAddress?: string | undefined;
    toAddress?: string | undefined;
    txHash?: string | undefined;
    confirmedAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    type: "send" | "receive" | "funding";
    status: "pending" | "confirmed" | "failed";
    walletId: string;
    amount: number;
    currency: string;
    fromAddress?: string | undefined;
    toAddress?: string | undefined;
    txHash?: string | undefined;
    confirmedAt?: Date | undefined;
}>;
export declare const VirtualCardRecord: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    cardId: z.ZodString;
    maskedPan: z.ZodString;
    encryptedData: z.ZodString;
    status: z.ZodEnum<["active", "suspended", "closed"]>;
    balance: z.ZodDefault<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    status: "active" | "suspended" | "closed";
    userId: string;
    balance: number;
    currency: string;
    cardId: string;
    maskedPan: string;
    encryptedData: string;
    updatedAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    status: "active" | "suspended" | "closed";
    userId: string;
    cardId: string;
    maskedPan: string;
    encryptedData: string;
    updatedAt?: Date | undefined;
    balance?: number | undefined;
    currency?: string | undefined;
}>;
export type TUser = z.infer<typeof User>;
export type TWallet = z.infer<typeof Wallet>;
export type TTransaction = z.infer<typeof Transaction>;
export type TVirtualCardRecord = z.infer<typeof VirtualCardRecord>;
