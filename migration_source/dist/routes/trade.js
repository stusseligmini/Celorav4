"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createTradeSchema = zod_1.z.object({
    fromSymbol: zod_1.z.string().min(1, 'From symbol is required'),
    toSymbol: zod_1.z.string().min(1, 'To symbol is required'),
    amount: zod_1.z.number().positive('Amount must be positive'),
    type: zod_1.z.enum(['MARKET', 'LIMIT']).default('MARKET'),
    limitPrice: zod_1.z.number().positive().optional(),
    slippage: zod_1.z.number().min(0).max(100).optional().default(1),
    walletId: zod_1.z.string().optional(),
});
const updateTradeSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'EXECUTED', 'FAILED', 'CANCELLED']).optional(),
    executedPrice: zod_1.z.number().positive().optional(),
    executedAmount: zod_1.z.number().positive().optional(),
    fee: zod_1.z.number().min(0).optional(),
    transactionHash: zod_1.z.string().optional(),
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status, type } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { userId };
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        const trades = await prisma.transaction.findMany({
            where: {
                ...where,
                type: 'TRADE',
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit),
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
        const total = await prisma.transaction.count({
            where: {
                ...where,
                type: 'TRADE',
            },
        });
        const totalPages = Math.ceil(total / Number(limit));
        res.json({
            success: true,
            data: {
                trades,
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
        console.error('Error fetching trades:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trades',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const trade = await prisma.transaction.findFirst({
            where: {
                id,
                userId,
                type: 'TRADE',
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
        if (!trade) {
            res.status(404).json({
                success: false,
                error: 'Trade not found',
            });
            return;
        }
        res.json({
            success: true,
            data: trade,
        });
    }
    catch (error) {
        console.error('Error fetching trade:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trade',
        });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createTradeSchema.parse(req.body);
        if (validatedData.walletId) {
            const wallet = await prisma.wallet.findFirst({
                where: {
                    id: validatedData.walletId,
                    userId,
                },
            });
            if (!wallet) {
                res.status(404).json({
                    success: false,
                    error: 'Wallet not found',
                });
                return;
            }
        }
        const [fromToken, toToken] = await Promise.all([
            prisma.marketData.findUnique({
                where: { symbol: validatedData.fromSymbol.toUpperCase() },
            }),
            prisma.marketData.findUnique({
                where: { symbol: validatedData.toSymbol.toUpperCase() },
            }),
        ]);
        if (!fromToken || !toToken) {
            res.status(400).json({
                success: false,
                error: 'Invalid trading pair - one or both tokens not found',
            });
            return;
        }
        const exchangeRate = fromToken.price / toToken.price;
        const estimatedOutput = validatedData.amount * exchangeRate;
        const estimatedFee = validatedData.amount * 0.001;
        const tradeMetadata = {
            fromSymbol: validatedData.fromSymbol.toUpperCase(),
            toSymbol: validatedData.toSymbol.toUpperCase(),
            tradeType: validatedData.type,
            limitPrice: validatedData.limitPrice,
            slippage: validatedData.slippage,
            estimatedOutput,
            exchangeRate,
            fromPrice: fromToken.price,
            toPrice: toToken.price,
        };
        const trade = await prisma.transaction.create({
            data: {
                userId,
                walletId: validatedData.walletId,
                type: 'TRADE',
                amount: validatedData.amount,
                fee: estimatedFee,
                status: 'PENDING',
                metadata: tradeMetadata,
                memo: `Trade ${validatedData.amount} ${validatedData.fromSymbol} for ${validatedData.toSymbol}`,
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
            data: {
                ...trade,
                estimatedOutput,
                exchangeRate,
            },
            message: 'Trade order created successfully',
        });
    }
    catch (error) {
        console.error('Error creating trade:', error);
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
            error: 'Failed to create trade',
        });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const validatedData = updateTradeSchema.parse(req.body);
        const existingTrade = await prisma.transaction.findFirst({
            where: {
                id,
                userId,
                type: 'TRADE',
            },
        });
        if (!existingTrade) {
            res.status(404).json({
                success: false,
                error: 'Trade not found',
            });
            return;
        }
        const updatedMetadata = {
            ...existingTrade.metadata,
            ...validatedData,
            updatedAt: new Date().toISOString(),
        };
        const trade = await prisma.transaction.update({
            where: { id },
            data: {
                status: validatedData.status || existingTrade.status,
                fee: validatedData.fee || existingTrade.fee,
                hash: validatedData.transactionHash || existingTrade.hash,
                metadata: updatedMetadata,
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
        res.json({
            success: true,
            data: trade,
            message: 'Trade updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating trade:', error);
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
            error: 'Failed to update trade',
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const existingTrade = await prisma.transaction.findFirst({
            where: {
                id,
                userId,
                type: 'TRADE',
            },
        });
        if (!existingTrade) {
            res.status(404).json({
                success: false,
                error: 'Trade not found',
            });
            return;
        }
        if (existingTrade.status === 'EXECUTED') {
            res.status(400).json({
                success: false,
                error: 'Cannot cancel an executed trade',
            });
            return;
        }
        const trade = await prisma.transaction.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                updatedAt: new Date(),
            },
        });
        res.json({
            success: true,
            data: trade,
            message: 'Trade cancelled successfully',
        });
    }
    catch (error) {
        console.error('Error cancelling trade:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel trade',
        });
    }
});
router.get('/pairs', async (req, res) => {
    try {
        const tokens = await prisma.marketData.findMany({
            where: { isActive: true },
            select: {
                symbol: true,
                name: true,
                price: true,
                change24h: true,
                volume24h: true,
            },
            orderBy: { rank: 'asc' },
        });
        const baseCurrency = 'SOL';
        const pairs = tokens
            .filter(token => token.symbol !== baseCurrency)
            .slice(0, 20)
            .map(token => ({
            pair: `${token.symbol}/${baseCurrency}`,
            baseSymbol: token.symbol,
            baseName: token.name,
            quoteSymbol: baseCurrency,
            price: token.price,
            change24h: token.change24h,
            volume24h: token.volume24h,
        }));
        res.json({
            success: true,
            data: pairs,
        });
    }
    catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trading pairs',
        });
    }
});
exports.default = router;
//# sourceMappingURL=trade.js.map