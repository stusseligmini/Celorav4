import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { period = '30d' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        };
        break;
      case '7d':
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case '30d':
      default:
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
        break;
    }

    const where = { userId, ...dateFilter };

    const [
      totalWallets,
      activeWallets,
      totalTransactions,
      confirmedTransactions,
      totalVolume,
      totalFees,
      tradeCount,
      recentTransactions,
      walletBalances,
    ] = await Promise.all([
      prisma.wallet.count({ where: { userId } }),
      prisma.wallet.count({ where: { userId, isActive: true } }),
      prisma.transaction.count({ where }),
      prisma.transaction.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'CONFIRMED' },
        _sum: { fee: true },
      }),
      prisma.transaction.count({ where: { ...where, type: 'TRADE' } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.wallet.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
        },
      }),
    ]);

    const analytics = {
      period,
      summary: {
        totalWallets,
        activeWallets,
        totalTransactions,
        confirmedTransactions,
        successRate: totalTransactions > 0 
          ? ((confirmedTransactions / totalTransactions) * 100).toFixed(2) 
          : '0.00',
        totalVolume: totalVolume._sum.amount || 0,
        totalFees: totalFees._sum.fee || 0,
        tradeCount,
      },
      recentActivity: recentTransactions,
      walletOverview: {
        totalBalance: walletBalances.reduce((sum, wallet) => sum + wallet.balance, 0),
        wallets: walletBalances,
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

// GET /api/analytics/transactions - Get transaction analytics
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { period = '30d', groupBy = 'day' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        };
        break;
      case '7d':
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case '30d':
      default:
        dateFilter = {
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
        break;
    }

    const where = { userId, ...dateFilter };

    const [
      transactionsByType,
      transactionsByStatus,
      volumeByDay,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _count: true,
        _sum: { amount: true, fee: true },
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // For a more detailed implementation, you'd use raw SQL for date grouping
      prisma.transaction.findMany({
        where,
        select: {
          createdAt: true,
          amount: true,
          type: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group volume by day (simplified)
    const dailyVolume = volumeByDay.reduce((acc, transaction) => {
      const date = transaction.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, volume: 0, count: 0 };
      }
      if (transaction.status === 'CONFIRMED') {
        acc[date].volume += transaction.amount;
      }
      acc[date].count += 1;
      return acc;
    }, {} as any);

    const analytics = {
      period,
      byType: transactionsByType.map(item => ({
        type: item.type,
        count: item._count,
        totalAmount: item._sum.amount || 0,
        totalFees: item._sum.fee || 0,
      })),
      byStatus: transactionsByStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      dailyVolume: Object.values(dailyVolume).slice(0, 30), // Last 30 days
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching transaction analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction analytics',
    });
  }
});

// GET /api/analytics/portfolio - Get portfolio analytics
router.get('/portfolio', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [wallets, transactions] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          address: true,
          lastSyncedAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          status: 'CONFIRMED',
        },
        select: {
          type: true,
          amount: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Calculate portfolio metrics
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    
    // Portfolio allocation by wallet type
    const allocation = wallets.reduce((acc, wallet) => {
      if (!acc[wallet.type]) {
        acc[wallet.type] = { type: wallet.type, balance: 0, percentage: 0 };
      }
      acc[wallet.type].balance += wallet.balance;
      return acc;
    }, {} as any);

    // Calculate percentages
    Object.values(allocation).forEach((item: any) => {
      item.percentage = totalBalance > 0 ? ((item.balance / totalBalance) * 100).toFixed(2) : '0.00';
    });

    // Trading performance (simplified)
    const trades = transactions.filter(tx => tx.type === 'TRADE');
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(trade => {
      const metadata = trade.metadata as any;
      return metadata?.executedPrice && metadata?.limitPrice 
        ? metadata.executedPrice > metadata.limitPrice 
        : false;
    }).length;

    const analytics = {
      totalBalance,
      walletCount: wallets.length,
      allocation: Object.values(allocation),
      trading: {
        totalTrades,
        profitableTrades,
        winRate: totalTrades > 0 
          ? ((profitableTrades / totalTrades) * 100).toFixed(2) 
          : '0.00',
      },
      recentActivity: transactions.slice(0, 10),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching portfolio analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio analytics',
    });
  }
});

export default router;
