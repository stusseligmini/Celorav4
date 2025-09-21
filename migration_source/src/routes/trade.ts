import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createTradeSchema = z.object({
  fromSymbol: z.string().min(1, 'From symbol is required'),
  toSymbol: z.string().min(1, 'To symbol is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  limitPrice: z.number().positive().optional(),
  slippage: z.number().min(0).max(100).optional().default(1), // 1% default slippage
  walletId: z.string().optional(),
});

const updateTradeSchema = z.object({
  status: z.enum(['PENDING', 'EXECUTED', 'FAILED', 'CANCELLED']).optional(),
  executedPrice: z.number().positive().optional(),
  executedAmount: z.number().positive().optional(),
  fee: z.number().min(0).optional(),
  transactionHash: z.string().optional(),
});

// GET /api/trades - Get user's trades
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, status, type } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };
    
    if (status) where.status = status;
    if (type) where.type = type;

    // Since we don't have a Trade model in the schema, let's use transactions with trade metadata
    const trades = await prisma.transaction.findMany({
      where: {
        ...where,
        type: 'TRADE', // Filter for trade transactions
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
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
    });
  }
});

// GET /api/trades/:id - Get specific trade
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
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
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade',
    });
  }
});

// POST /api/trades - Create new trade
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedData = createTradeSchema.parse(req.body);

    // Verify wallet belongs to user if walletId provided
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

    // Get current prices for the trade pair
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

    // Calculate estimated output amount
    const exchangeRate = fromToken.price / toToken.price;
    const estimatedOutput = validatedData.amount * exchangeRate;
    const estimatedFee = validatedData.amount * 0.001; // 0.1% fee

    // Create trade transaction with metadata
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
  } catch (error) {
    console.error('Error creating trade:', error);
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
      error: 'Failed to create trade',
    });
  }
});

// PUT /api/trades/:id - Update trade status
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const validatedData = updateTradeSchema.parse(req.body);

    // Check if trade exists and belongs to user
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

    // Update metadata with execution details
    const updatedMetadata = {
      ...existingTrade.metadata as any,
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
  } catch (error) {
    console.error('Error updating trade:', error);
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
      error: 'Failed to update trade',
    });
  }
});

// DELETE /api/trades/:id - Cancel trade
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if trade exists and belongs to user
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
  } catch (error) {
    console.error('Error cancelling trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel trade',
    });
  }
});

// GET /api/trades/pairs - Get available trading pairs
router.get('/pairs', async (req, res: Response): Promise<void> => {
  try {
    // Get all active market data as potential trading pairs
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

    // Generate trading pairs (for demo, showing major pairs with SOL)
    const baseCurrency = 'SOL';
    const pairs = tokens
      .filter(token => token.symbol !== baseCurrency)
      .slice(0, 20) // Limit to top 20 tokens
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
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading pairs',
    });
  }
});

export default router;
