"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createPortfolioSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    isPublic: zod_1.z.boolean().default(false)
});
const addAssetSchema = zod_1.z.object({
    symbol: zod_1.z.string().min(1).max(20),
    amount: zod_1.z.number().positive(),
    averageCost: zod_1.z.number().positive(),
    notes: zod_1.z.string().optional()
});
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolios = await prisma.portfolio.findMany({
            where: { userId },
            include: {
                assets: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const portfoliosWithValues = await Promise.all(portfolios.map(async (portfolio) => {
            let totalValue = 0;
            let totalCost = 0;
            for (const asset of portfolio.assets) {
                const currentPrice = 0;
                const value = asset.quantity * currentPrice;
                const cost = asset.quantity * asset.averageCost;
                totalValue += value;
                totalCost += cost;
            }
            const pnl = totalValue - totalCost;
            const pnlPercentage = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
            return {
                ...portfolio,
                totalValue,
                totalCost,
                pnl,
                pnlPercentage,
                assetCount: portfolio.assets?.length || 0
            };
        }));
        res.json({
            success: true,
            data: portfoliosWithValues
        });
    }
    catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch portfolios'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = req.params.id;
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            },
            include: {
                assets: true,
                _count: {
                    assets: true
                }
            }
        });
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                error: 'Portfolio not found'
            });
        }
        let totalValue = 0;
        let totalCost = 0;
        const assetBreakdown = [];
        for (const asset of portfolio.assets) {
            const currentPrice = 0;
            const value = asset.quantity * currentPrice;
            const cost = asset.quantity * asset.averageCost;
            const pnl = value - cost;
            const pnlPercentage = cost > 0 ? (pnl / cost) * 100 : 0;
            totalValue += value;
            totalCost += cost;
            assetBreakdown.push({
                ...asset,
                currentPrice,
                value,
                cost,
                pnl,
                pnlPercentage,
                allocation: 0
            });
        }
        assetBreakdown.forEach(asset => {
            asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
        });
        const portfolioMetrics = {
            ...portfolio,
            totalValue,
            totalCost,
            pnl: totalValue - totalCost,
            pnlPercentage: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
            assetCount: portfolio.assets.length,
            assets: assetBreakdown
        };
        res.json({
            success: true,
            data: portfolioMetrics
        });
    }
    catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch portfolio'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createPortfolioSchema.parse(req.body);
        const portfolio = await prisma.portfolio.create({
            data: {
                ...validatedData,
                userId
            },
            include: {
                _count: {
                    select: { assets: true }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: {
                ...portfolio,
                totalValue: 0,
                totalCost: 0,
                pnl: 0,
                pnlPercentage: 0,
                assetCount: 0
            }
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors
            });
        }
        console.error('Error creating portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create portfolio'
        });
    }
});
router.post('/:id/assets', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = req.params.id;
        const validatedData = addAssetSchema.parse(req.body);
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                error: 'Portfolio not found'
            });
        }
        const existingAsset = await prisma.portfolioAsset.findFirst({
            where: {
                portfolioId,
                symbol: validatedData.symbol.toUpperCase()
            }
        });
        if (existingAsset) {
            const totalAmount = existingAsset.quantity + validatedData.amount;
            const totalCost = (existingAsset.quantity * existingAsset.averageCost) +
                (validatedData.amount * validatedData.averageCost);
            const newAverageCost = totalCost / totalAmount;
            const updatedAsset = await prisma.portfolioAsset.update({
                where: { id: existingAsset.id },
                data: {
                    quantity: totalAmount,
                    amount: totalAmount,
                    averageCost: newAverageCost,
                    notes: validatedData.notes || existingAsset.notes,
                    updatedAt: new Date()
                }
            });
            return res.json({
                success: true,
                data: updatedAsset,
                message: 'Asset updated successfully'
            });
        }
        const asset = await prisma.portfolioAsset.create({
            data: {
                symbol: validatedData.symbol.toUpperCase(),
                portfolioId,
                quantity: validatedData.amount,
                amount: validatedData.amount,
                averageCost: validatedData.averageCost,
                notes: validatedData.notes
            }
        });
        res.status(201).json({
            success: true,
            data: asset
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors
            });
        }
        console.error('Error adding asset to portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add asset to portfolio'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = req.params.id;
        const validatedData = createPortfolioSchema.partial().parse(req.body);
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                error: 'Portfolio not found'
            });
        }
        const updatedPortfolio = await prisma.portfolio.update({
            where: { id: portfolioId },
            data: {
                ...validatedData,
                updatedAt: new Date()
            },
            include: {
                _count: {
                    select: { assets: true }
                }
            }
        });
        res.json({
            success: true,
            data: updatedPortfolio
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.errors
            });
        }
        console.error('Error updating portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update portfolio'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = req.params.id;
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                error: 'Portfolio not found'
            });
        }
        await prisma.portfolioAsset.deleteMany({
            where: { portfolioId }
        });
        await prisma.portfolio.delete({
            where: { id: portfolioId }
        });
        res.json({
            success: true,
            message: 'Portfolio deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete portfolio'
        });
    }
});
router.delete('/:id/assets/:assetId', async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolioId = req.params.id;
        const assetId = req.params.assetId;
        const portfolio = await prisma.portfolio.findFirst({
            where: {
                id: portfolioId,
                userId
            }
        });
        if (!portfolio) {
            return res.status(404).json({
                success: false,
                error: 'Portfolio not found'
            });
        }
        const asset = await prisma.portfolioAsset.findFirst({
            where: {
                id: assetId,
                portfolioId
            }
        });
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        await prisma.portfolioAsset.delete({
            where: { id: assetId }
        });
        res.json({
            success: true,
            message: 'Asset removed from portfolio successfully'
        });
    }
    catch (error) {
        console.error('Error removing asset from portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove asset from portfolio'
        });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.js.map