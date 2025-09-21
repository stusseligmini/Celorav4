import { z } from 'zod';

export const User = z.object({
  id: z.string().uuid(),
  username: z.string().min(1).max(50),
  email: z.string().email().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional()
});

export const Wallet = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  address: z.string().min(1),
  blockchain: z.enum(['solana', 'ethereum']),
  balance: z.number().nonnegative().default(0),
  createdAt: z.date(),
  updatedAt: z.date().optional()
});

export const Transaction = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  type: z.enum(['send', 'receive', 'funding']),
  amount: z.number(),
  currency: z.string().length(3),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  txHash: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  createdAt: z.date(),
  confirmedAt: z.date().optional()
});

export const VirtualCardRecord = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  cardId: z.string(),
  maskedPan: z.string(),
  encryptedData: z.string(),
  status: z.enum(['active', 'suspended', 'closed']),
  balance: z.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  createdAt: z.date(),
  updatedAt: z.date().optional()
});

export type TUser = z.infer<typeof User>;
export type TWallet = z.infer<typeof Wallet>;
export type TTransaction = z.infer<typeof Transaction>;
export type TVirtualCardRecord = z.infer<typeof VirtualCardRecord>;