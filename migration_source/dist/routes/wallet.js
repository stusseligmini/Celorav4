"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createWalletSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    address: zod_1.z.string().min(1, 'Address is required'),
    publicKey: zod_1.z.string().optional(),
    type: zod_1.z.string().default('SOLANA'),
    network: zod_1.z.string().default('mainnet'),
    isPrimary: zod_1.z.boolean().optional().default(false),
});
const updateWalletSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    balance: zod_1.z.number().min(0).optional(),
    isPrimary: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const wallets = await prisma.wallet.findMany({
            where: { userId },
            orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                _count: {
                    select: {
                        transactions: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: wallets,
        });
    }
    catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallets',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const wallet = await prisma.wallet.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        transactions: true
                    }
                }
            },
        });
        if (!wallet) {
            res.status(404).json({
                success: false,
                error: 'Wallet not found',
            });
            return;
        }
        res.json({
            success: true,
            data: wallet,
        });
    }
    catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallet',
        });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = createWalletSchema.parse(req.body);
        const existingWallet = await prisma.wallet.findUnique({
            where: { address: validatedData.address },
        });
        if (existingWallet) {
            res.status(400).json({
                success: false,
                error: 'Wallet address already exists',
            });
            return;
        }
        if (validatedData.isPrimary) {
            await prisma.wallet.updateMany({
                where: {
                    userId,
                    isPrimary: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        const wallet = await prisma.wallet.create({
            data: {
                ...validatedData,
                userId,
            },
        });
        res.status(201).json({
            success: true,
            data: wallet,
            message: 'Wallet created successfully',
        });
    }
    catch (error) {
        console.error('Error creating wallet:', error);
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
            error: 'Failed to create wallet',
        });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const validatedData = updateWalletSchema.parse(req.body);
        const existingWallet = await prisma.wallet.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!existingWallet) {
            res.status(404).json({
                success: false,
                error: 'Wallet not found',
            });
            return;
        }
        if (validatedData.isPrimary) {
            await prisma.wallet.updateMany({
                where: {
                    userId,
                    isPrimary: true,
                    id: { not: id },
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        const wallet = await prisma.wallet.update({
            where: { id },
            data: validatedData,
        });
        res.json({
            success: true,
            data: wallet,
            message: 'Wallet updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating wallet:', error);
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
            error: 'Failed to update wallet',
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const existingWallet = await prisma.wallet.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!existingWallet) {
            res.status(404).json({
                success: false,
                error: 'Wallet not found',
            });
            return;
        }
        if (existingWallet.isPrimary) {
            const walletCount = await prisma.wallet.count({
                where: { userId, isActive: true },
            });
            if (walletCount === 1) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot delete the only active wallet',
                });
                return;
            }
        }
        const wallet = await prisma.wallet.update({
            where: { id },
            data: {
                isActive: false,
                isPrimary: false,
            },
        });
        res.json({
            success: true,
            data: wallet,
            message: 'Wallet deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting wallet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete wallet',
        });
    }
});
router.get('/:id/sync', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const wallet = await prisma.wallet.findFirst({
            where: {
                id,
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
        const updatedWallet = await prisma.wallet.update({
            where: { id },
            data: {
                lastSyncedAt: new Date(),
            },
        });
        res.json({
            success: true,
            data: updatedWallet,
            message: 'Wallet synced successfully',
        });
    }
    catch (error) {
        console.error('Error syncing wallet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync wallet',
        });
    }
});
exports.default = router;
//# sourceMappingURL=wallet.js.map