const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { sentryUtils } = require('../config/sentry');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      pendingTransactions,
      totalWallets,
      totalCards,
      recentRegistrations,
      recentLogins,
      securityEvents
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (logged in within last 30 days)
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total transactions
      prisma.transaction.count(),
      
      // Pending transactions
      prisma.transaction.count({
        where: { status: 'PENDING' }
      }),
      
      // Total wallets
      prisma.wallet.count(),
      
      // Total virtual cards
      prisma.virtualCard.count(),
      
      // Recent registrations (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Recent logins (last 24 hours)
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Recent security events (last 7 days)
      prisma.securityEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          severity: {
            in: ['high', 'critical']
          }
        }
      })
    ]);
    
    // Transaction volume (last 30 days)
    const transactionVolume = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          recentRegistrations
        },
        transactions: {
          total: totalTransactions,
          pending: pendingTransactions,
          volume30d: transactionVolume._sum.amount || 0
        },
        wallets: {
          total: totalWallets
        },
        cards: {
          total: totalCards
        },
        activity: {
          recentLogins,
          securityEvents
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Admin dashboard failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
});

// User management - List users
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('kycStatus').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW'])
], validateRequest, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    // Search filter
    if (req.query.search) {
      where.OR = [
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { username: { contains: req.query.search, mode: 'insensitive' } },
        { firstName: { contains: req.query.search, mode: 'insensitive' } },
        { lastName: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }
    
    // Status filter
    if (req.query.status) {
      where.isActive = req.query.status === 'active';
    }
    
    // KYC status filter
    if (req.query.kycStatus) {
      where.kycStatus = req.query.kycStatus;
    }
    
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
          kycStatus: true,
          role: true,
          emailVerified: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          _count: {
            select: {
              wallets: true,
              virtualCards: true,
              transactions: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Admin user list failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load users'
    });
  }
});

// User details
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        wallets: {
          select: {
            id: true,
            address: true,
            type: true,
            balance: true,
            isActive: true,
            createdAt: true
          }
        },
        virtualCards: {
          select: {
            id: true,
            cardNumber: true,
            cardType: true,
            status: true,
            balance: true,
            createdAt: true
          }
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        loginHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        securityEvents: {
          where: {
            severity: { in: ['medium', 'high', 'critical'] }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    logger.error('Admin user details failed', {
      error: error.message,
      userId: req.user.id,
      targetUserId: req.params.userId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load user details'
    });
  }
});

// Update user status
router.put('/users/:userId/status', [
  body('isActive').isBoolean(),
  body('suspensionReason').optional().isString(),
  body('suspensionExpires').optional().isISO8601()
], validateRequest, async (req, res) => {
  try {
    const { isActive, suspensionReason, suspensionExpires } = req.body;
    
    const updateData = {
      isActive,
      suspended: !isActive
    };
    
    if (!isActive && suspensionReason) {
      updateData.suspensionReason = suspensionReason;
      updateData.suspensionExpires = suspensionExpires ? new Date(suspensionExpires) : null;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        isActive: true,
        suspended: true,
        suspensionReason: true,
        suspensionExpires: true
      }
    });
    
    // Log the action
    logger.audit.securityEvent(
      `user_status_changed_by_admin`,
      req.params.userId,
      req.ip,
      'high',
      {
        adminUserId: req.user.id,
        newStatus: isActive ? 'active' : 'suspended',
        reason: suspensionReason
      }
    );
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      data: { user: updatedUser }
    });
    
  } catch (error) {
    logger.error('Admin user status update failed', {
      error: error.message,
      userId: req.user.id,
      targetUserId: req.params.userId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// Update user KYC status
router.put('/users/:userId/kyc', [
  body('kycStatus').isIn(['PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW']),
  body('kycRejectedReason').optional().isString(),
  body('kycLevel').optional().isInt({ min: 0, max: 3 })
], validateRequest, async (req, res) => {
  try {
    const { kycStatus, kycRejectedReason, kycLevel } = req.body;
    
    const updateData = {
      kycStatus,
      kycLevel: kycLevel || 0
    };
    
    if (kycStatus === 'APPROVED') {
      updateData.kycVerifiedAt = new Date();
    } else if (kycStatus === 'REJECTED' && kycRejectedReason) {
      updateData.kycRejectedReason = kycRejectedReason;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        kycStatus: true,
        kycLevel: true,
        kycVerifiedAt: true,
        kycRejectedReason: true
      }
    });
    
    // Log the action
    logger.audit.securityEvent(
      `kyc_status_changed_by_admin`,
      req.params.userId,
      req.ip,
      'high',
      {
        adminUserId: req.user.id,
        newStatus: kycStatus,
        level: kycLevel
      }
    );
    
    res.json({
      success: true,
      message: `KYC status updated to ${kycStatus}`,
      data: { user: updatedUser }
    });
    
  } catch (error) {
    logger.error('Admin KYC status update failed', {
      error: error.message,
      userId: req.user.id,
      targetUserId: req.params.userId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update KYC status'
    });
  }
});

// Transaction management - List transactions
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  query('type').optional().isString(),
  query('userId').optional().isUUID(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], validateRequest, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.userId) where.userId = req.query.userId;
    
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo);
    }
    
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          },
          wallet: {
            select: {
              id: true,
              address: true,
              type: true
            }
          },
          virtualCard: {
            select: {
              id: true,
              cardNumber: true,
              cardType: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Admin transaction list failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load transactions'
    });
  }
});

// Security events
router.get('/security-events', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('eventType').optional().isString(),
  query('resolved').optional().isBoolean()
], validateRequest, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.eventType) where.eventType = req.query.eventType;
    if (req.query.resolved !== undefined) where.resolved = req.query.resolved;
    
    const [events, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.securityEvent.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Admin security events failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load security events'
    });
  }
});

// System logs
router.get('/logs', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], validateRequest, async (req, res) => {
  try {
    // This would integrate with your logging system
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Log viewing functionality would be implemented here',
      data: {
        logs: [],
        pagination: {
          page: 1,
          limit: 20,
          totalCount: 0,
          totalPages: 0
        }
      }
    });
    
  } catch (error) {
    logger.error('Admin logs failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load logs'
    });
  }
});

// System settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });
    
    res.json({
      success: true,
      data: { settings }
    });
    
  } catch (error) {
    logger.error('Admin settings failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to load settings'
    });
  }
});

// Update system setting
router.put('/settings/:key', [
  body('value').exists(),
  body('description').optional().isString()
], validateRequest, async (req, res) => {
  try {
    const { value, description } = req.body;
    
    const setting = await prisma.systemConfig.upsert({
      where: { key: req.params.key },
      update: {
        value,
        description,
        updatedAt: new Date()
      },
      create: {
        key: req.params.key,
        value,
        description
      }
    });
    
    // Log the configuration change
    logger.info('System setting updated by admin', {
      adminUserId: req.user.id,
      key: req.params.key,
      newValue: value
    });
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: { setting }
    });
    
  } catch (error) {
    logger.error('Admin setting update failed', {
      error: error.message,
      userId: req.user.id,
      key: req.params.key
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

module.exports = router;
