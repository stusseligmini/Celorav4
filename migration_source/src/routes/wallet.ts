import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createWalletSchema = z.object({
  name: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  publicKey: z.string().optional(),
  type: z.string().default('SOLANA'),
  network: z.string().default('mainnet'),
  isPrimary: z.boolean().optional().default(false),
});

const updateWalletSchema = z.object({
  name: z.string().optional(),
  balance: z.number().min(0).optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/wallets - Get user's wallets
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

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
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallets',
    });
  }
});

// GET /api/wallets/:id - Get specific wallet
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet',
    });
  }
});

// POST /api/wallets - Create new wallet
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedData = createWalletSchema.parse(req.body);

    // Check if wallet address already exists
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

    // If this is set as primary, unset other primary wallets
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
  } catch (error) {
    console.error('Error creating wallet:', error);
    if (error instanceof z.ZodError) {
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

// PUT /api/wallets/:id - Update wallet
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const validatedData = updateWalletSchema.parse(req.body);

    // Check if wallet exists and belongs to user
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

    // If setting as primary, unset other primary wallets
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
  } catch (error) {
    console.error('Error updating wallet:', error);
    if (error instanceof z.ZodError) {
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

// DELETE /api/wallets/:id - Delete wallet
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if wallet exists and belongs to user
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

    // Don't allow deletion of primary wallet if it's the only one
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

    // Soft delete by setting isActive to false
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
  } catch (error) {
    console.error('Error deleting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete wallet',
    });
  }
});

// GET /api/wallets/:id/sync - Sync wallet balance
router.get('/:id/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    // TODO: Implement actual blockchain balance sync
    // For now, just update the lastSyncedAt timestamp
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
  } catch (error) {
    console.error('Error syncing wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync wallet',
    });
  }
});

export default router;
