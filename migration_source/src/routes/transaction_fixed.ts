import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const createTransactionSchema = z.object({
  walletId: z.string().optional(),
  signature: z.string().optional(),
  hash: z.string().optional(),
  type: z.string().min(1, 'Transaction type is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  fee: z.number().min(0).optional(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  memo: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateTransactionSchema = z.object({
  status: z.string().optional(),
  confirmations: z.number().optional(),
  blockHeight: z.number().optional(),
  blockTime: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// GET /api/transactions - Get user's transactions with filtering and pagination
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      walletId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
    } = req.query;

    const where: any = { userId };

    // Apply filters
    if (type) where.type = type;
    if (status) where.status = status;
    if (walletId) where.walletId = walletId;
    if (minAmount) where.amount = { gte: Number(minAmount) };
    if (maxAmount) where.amount = { ...where.amount, lte: Number(maxAmount) };
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const orderBy = { [sortBy as string]: sortOrder };

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
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
});

// GET /api/transactions/:id - Get specific transaction
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
    });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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
  } catch (error) {
    console.error('Error creating transaction:', error);
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
      error: 'Failed to create transaction',
    });
  }
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    const updateData: any = { ...validatedData };
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
  } catch (error) {
    console.error('Error updating transaction:', error);
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
      error: 'Failed to update transaction',
    });
  }
});

// GET /api/transactions/stats/summary - Get transaction statistics
router.get('/stats/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [
      totalTransactions,
      pendingTransactions,
      confirmedTransactions,
      failedTransactions,
    ] = await Promise.all([
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
      }, {} as Record<string, { count: number; totalAmount: number }>),
      recent: recentTransactions,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics',
    });
  }
});

export default router;
