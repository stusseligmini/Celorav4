import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Simple in-memory alerts system (in production, use a proper database table)
interface Alert {
  id: string;
  userId: string;
  type: 'PRICE' | 'BALANCE' | 'TRANSACTION' | 'SYSTEM';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

const alerts: Alert[] = [];

const createAlertSchema = z.object({
  type: z.enum(['PRICE', 'BALANCE', 'TRANSACTION', 'SYSTEM']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.string(), z.any()).optional(),
});

// GET /api/alerts - Get user's alerts
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    let userAlerts = alerts.filter(alert => alert.userId === userId);

    // Apply filters
    if (type) {
      userAlerts = userAlerts.filter(alert => alert.type === type);
    }
    if (unreadOnly === 'true') {
      userAlerts = userAlerts.filter(alert => !alert.isRead);
    }

    // Sort by creation date (newest first)
    userAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedAlerts = userAlerts.slice(skip, skip + Number(limit));
    const total = userAlerts.length;
    const totalPages = Math.ceil(total / Number(limit));

    // Get unread count
    const unreadCount = alerts.filter(alert => alert.userId === userId && !alert.isRead).length;

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

// GET /api/alerts/:id - Get specific alert
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const alert = alerts.find(alert => alert.id === id && alert.userId === userId);

    if (!alert) {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
      return;
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});

// POST /api/alerts - Create new alert
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedData = createAlertSchema.parse(req.body);

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...validatedData,
      isRead: false,
      createdAt: new Date(),
    };

    alerts.push(alert);

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Alert created successfully',
    });
  } catch (error) {
    console.error('Error creating alert:', error);
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
      error: 'Failed to create alert',
    });
  }
});

// PUT /api/alerts/:id/read - Mark alert as read
router.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const alertIndex = alerts.findIndex(alert => alert.id === id && alert.userId === userId);

    if (alertIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
      return;
    }

    alerts[alertIndex].isRead = true;

    res.json({
      success: true,
      data: alerts[alertIndex],
      message: 'Alert marked as read',
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark alert as read',
    });
  }
});

// PUT /api/alerts/read-all - Mark all alerts as read
router.put('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const userAlertIndices = alerts
      .map((alert, index) => ({ alert, index }))
      .filter(({ alert }) => alert.userId === userId && !alert.isRead)
      .map(({ index }) => index);

    userAlertIndices.forEach(index => {
      alerts[index].isRead = true;
    });

    res.json({
      success: true,
      message: `Marked ${userAlertIndices.length} alerts as read`,
      data: {
        updatedCount: userAlertIndices.length,
      },
    });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all alerts as read',
    });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const alertIndex = alerts.findIndex(alert => alert.id === id && alert.userId === userId);

    if (alertIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
      return;
    }

    const deletedAlert = alerts.splice(alertIndex, 1)[0];

    res.json({
      success: true,
      data: deletedAlert,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert',
    });
  }
});

// GET /api/alerts/stats/summary - Get alert statistics
router.get('/stats/summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const userAlerts = alerts.filter(alert => alert.userId === userId);
    
    const stats = {
      total: userAlerts.length,
      unread: userAlerts.filter(alert => !alert.isRead).length,
      byType: userAlerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: userAlerts
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics',
    });
  }
});

// Helper function to create system alerts (can be called from other parts of the application)
export const createSystemAlert = (userId: string, title: string, message: string, data?: any) => {
  const alert: Alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: 'SYSTEM',
    title,
    message,
    data,
    isRead: false,
    createdAt: new Date(),
  };
  
  alerts.push(alert);
  return alert;
};

// Demo endpoint to create sample alerts
router.post('/demo/create-sample', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const sampleAlerts = [
      {
        type: 'PRICE' as const,
        title: 'Price Alert: SOL',
        message: 'SOL has reached your target price of $150.00',
        data: { symbol: 'SOL', price: 150.00, targetPrice: 150.00 },
      },
      {
        type: 'TRANSACTION' as const,
        title: 'Transaction Confirmed',
        message: 'Your transaction of 0.5 SOL has been confirmed',
        data: { amount: 0.5, symbol: 'SOL', txHash: '0x123...abc' },
      },
      {
        type: 'BALANCE' as const,
        title: 'Low Balance Warning',
        message: 'Your wallet balance is below the minimum threshold',
        data: { balance: 0.01, threshold: 0.05 },
      },
      {
        type: 'SYSTEM' as const,
        title: 'Welcome to Celora',
        message: 'Your account has been successfully set up!',
        data: { setupComplete: true },
      },
    ];

    const createdAlerts = sampleAlerts.map(alertData => {
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        ...alertData,
        isRead: false,
        createdAt: new Date(),
      };
      alerts.push(alert);
      return alert;
    });

    res.json({
      success: true,
      data: createdAlerts,
      message: 'Sample alerts created successfully',
    });
  } catch (error) {
    console.error('Error creating sample alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sample alerts',
    });
  }
});

export default router;
