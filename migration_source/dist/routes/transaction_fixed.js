"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createTransactionSchema = zod_1.z.object({
    walletId: zod_1.z.string().optional(),
    signature: zod_1.z.string().optional(),
    hash: zod_1.z.string().optional(),
    type: zod_1.z.string().min(1, 'Transaction type is required'),
    amount: zod_1.z.number().min(0, 'Amount must be positive'),
    fee: zod_1.z.number().min(0).optional(),
    fromAddress: zod_1.z.string().optional(),
    toAddress: zod_1.z.string().optional(),
    memo: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
const updateTransactionSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    confirmations: zod_1.z.number().optional(),
    blockHeight: zod_1.z.number().optional(),
    blockTime: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, type, status, walletId, sortBy = 'createdAt', sortOrder = 'desc', dateFrom, dateTo, minAmount, maxAmount, } = req.query;
        const where = { userId };
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (walletId)
            where.walletId = walletId;
        if (minAmount)
            where.amount = { gte: Number(minAmount) };
        if (maxAmount)
            where.amount = { ...where.amount, lte: Number(maxAmount) };
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo);
        }
        const skip = (Number(page) - 1) * Number(limit);
        const orderBy = { [sortBy]: sortOrder };
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy,
                include: {
                    wallet: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            type: true,
                        },
                    },
                },
            }),
            prisma.transaction.count({ where }),
        ]);
        const totalPages = Math.ceil(total / Number(limit));
        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                    hasNext: Number(page) < totalPages,
                    hasPrev: Number(page) > 1,
                },
            },
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId },
            include: {
                wallet: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        type: true,
                    },
                },
            },
        });
        if (!transaction) {
            res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
            return;
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction',
        });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createTransactionSchema.parse(req.body);
        const transaction = await prisma.transaction.create({
            data: {
                ...validatedData,
                userId,
                blockTime: validatedData.metadata?.blockTime
                    ? new Date(validatedData.metadata.blockTime)
                    : undefined,
            },
            include: {
                wallet: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        type: true,
                    },
                },
            },
        });
        res.status(201).json({
            success: true,
            data: transaction,
            message: 'Transaction created successfully',
        });
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create transaction',
        });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const validatedData = updateTransactionSchema.parse(req.body);
        const existingTransaction = await prisma.transaction.findFirst({
            where: { id, userId },
        });
        if (!existingTransaction) {
            res.status(404).json({
                success: false,
                error: 'Transaction not found',
            });
            return;
        }
        const updateData = { ...validatedData };
        if (validatedData.blockTime) {
            updateData.blockTime = new Date(validatedData.blockTime);
        }
        const transaction = await prisma.transaction.update({
            where: { id },
            data: updateData,
            include: {
                wallet: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        type: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            data: transaction,
            message: 'Transaction updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update transaction',
        });
    }
});
router.get('/stats/summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [totalTransactions, pendingTransactions, confirmedTransactions, failedTransactions,] = await Promise.all([
            prisma.transaction.count({ where: { userId } }),
            prisma.transaction.count({ where: { userId, status: 'PENDING' } }),
            prisma.transaction.count({ where: { userId, status: 'CONFIRMED' } }),
            prisma.transaction.count({ where: { userId, status: 'FAILED' } }),
        ]);
        const transactionStats = await prisma.transaction.groupBy({
            by: ['type'],
            where: { userId },
            _count: { type: true },
            _sum: { amount: true },
        });
        const recentTransactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                wallet: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        type: true,
                    },
                },
            },
        });
        const stats = {
            total: totalTransactions,
            pending: pendingTransactions,
            confirmed: confirmedTransactions,
            failed: failedTransactions,
            byType: transactionStats.reduce((acc, stat) => {
                acc[stat.type] = {
                    count: stat._count.type,
                    totalAmount: stat._sum.amount || 0,
                };
                return acc;
            }, {}),
            recent: recentTransactions,
        };
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction statistics',
        });
    }
});
exports.default = router;
//# sourceMappingURL=transaction_fixed.js.map