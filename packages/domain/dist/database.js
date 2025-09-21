"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualCardRecord = exports.Transaction = exports.Wallet = exports.User = void 0;
const zod_1 = require("zod");
exports.User = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    username: zod_1.z.string().min(1).max(50),
    email: zod_1.z.string().email().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional()
});
exports.Wallet = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    address: zod_1.z.string().min(1),
    blockchain: zod_1.z.enum(['solana', 'ethereum']),
    balance: zod_1.z.number().nonnegative().default(0),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional()
});
exports.Transaction = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    walletId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['send', 'receive', 'funding']),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().length(3),
    fromAddress: zod_1.z.string().optional(),
    toAddress: zod_1.z.string().optional(),
    txHash: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'confirmed', 'failed']),
    createdAt: zod_1.z.date(),
    confirmedAt: zod_1.z.date().optional()
});
exports.VirtualCardRecord = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    cardId: zod_1.z.string(),
    maskedPan: zod_1.z.string(),
    encryptedData: zod_1.z.string(),
    status: zod_1.z.enum(['active', 'suspended', 'closed']),
    balance: zod_1.z.number().nonnegative().default(0),
    currency: zod_1.z.string().length(3).default('USD'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional()
});
