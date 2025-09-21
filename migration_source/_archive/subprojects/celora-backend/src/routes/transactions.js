const express = require('express');
const { body, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

const { authenticateToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Solana connection
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Get user transactions with filtering and pagination
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Valid page number required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Valid limit required (1-100)'),
  query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CARD_PAYMENT', 'CARD_LOAD', 'QR_PAYMENT']),
  query('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  query('walletId').optional().isUUID().withMessage('Valid wallet ID required'),
  query('cardId').optional().isUUID().withMessage('Valid card ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required')
], handleValidation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      walletId,
      cardId,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      userId: req.user.id
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (walletId) where.walletId = walletId;
    if (cardId) where.virtualCardId = cardId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit),
        include: {
          wallet: {
            select: {
              name: true,
              type: true,
              currency: true
            }
          },
          virtualCard: {
            select: {
              name: true,
              cardNumber: true
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    // Mask card numbers if present
    const maskedTransactions = transactions.map(tx => ({
      ...tx,
      virtualCard: tx.virtualCard ? {
        ...tx.virtualCard,
        cardNumber: `**** **** **** ${tx.virtualCard.cardNumber.slice(-4)}`
      } : null
    }));

    res.json({
      transactions: maskedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: offset + parseInt(limit) < totalCount
      }
    });

  } catch (error) {
    logger.error('Transactions fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      code: 'TRANSACTIONS_FETCH_ERROR'
    });
  }
});

// Get transaction by ID
router.get('/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      },
      include: {
        wallet: {
          select: {
            name: true,
            type: true,
            currency: true,
            address: true
          }
        },
        virtualCard: {
          select: {
            name: true,
            cardNumber: true,
            type: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }

    // Mask card number if present
    if (transaction.virtualCard) {
      transaction.virtualCard.cardNumber = `**** **** **** ${transaction.virtualCard.cardNumber.slice(-4)}`;
    }

    res.json({ transaction });

  } catch (error) {
    logger.error('Transaction detail fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction details',
      code: 'TRANSACTION_DETAIL_ERROR'
    });
  }
});

// Create wallet transfer transaction
router.post('/transfer', authenticateToken, [
  body('fromWalletId').isUUID().withMessage('Valid source wallet ID required'),
  body('toWalletId').isUUID().withMessage('Valid destination wallet ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  body('description').optional().trim()
], handleValidation, async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, description } = req.body;

    if (fromWalletId === toWalletId) {
      return res.status(400).json({
        error: 'Cannot transfer to the same wallet',
        code: 'SAME_WALLET_TRANSFER'
      });
    }

    // Verify both wallets belong to user
    const [fromWallet, toWallet] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: fromWalletId, userId: req.user.id, isActive: true }
      }),
      prisma.wallet.findFirst({
        where: { id: toWalletId, userId: req.user.id, isActive: true }
      })
    ]);

    if (!fromWallet || !toWallet) {
      return res.status(404).json({
        error: 'One or both wallets not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance in source wallet',
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    // Perform transfer transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from source wallet
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount } }
      });

      // Add to destination wallet (convert if different currencies)
      const transferAmount = fromWallet.currency === toWallet.currency ? amount : amount; // TODO: Add currency conversion
      await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: transferAmount } }
      });

      // Create outgoing transaction
      const outgoingTx = await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId: req.user.id,
          walletId: fromWalletId,
          type: 'TRANSFER',
          amount: -amount,
          currency: fromWallet.currency,
          status: 'COMPLETED',
          description: description || `Transfer to ${toWallet.name}`,
          metadata: {
            toWalletId: toWalletId,
            toWalletName: toWallet.name,
            transferType: 'outgoing'
          }
        }
      });

      // Create incoming transaction
      const incomingTx = await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId: req.user.id,
          walletId: toWalletId,
          type: 'TRANSFER',
          amount: transferAmount,
          currency: toWallet.currency,
          status: 'COMPLETED',
          description: description || `Transfer from ${fromWallet.name}`,
          metadata: {
            fromWalletId: fromWalletId,
            fromWalletName: fromWallet.name,
            transferType: 'incoming'
          }
        }
      });

      return { outgoingTx, incomingTx };
    });

    logger.info(`Wallet transfer completed: ${amount} ${fromWallet.currency} from ${fromWallet.name} to ${toWallet.name} by user ${req.user.email}`);

    res.status(201).json({
      message: 'Transfer completed successfully',
      transactions: {
        outgoing: result.outgoingTx,
        incoming: result.incomingTx
      }
    });

  } catch (error) {
    logger.error('Wallet transfer error:', error);
    res.status(500).json({
      error: 'Transfer failed',
      code: 'TRANSFER_ERROR'
    });
  }
});

// Create QR payment
router.post('/qr-payment', authenticateToken, [
  body('walletId').isUUID().withMessage('Valid wallet ID required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  body('recipientAddress').notEmpty().withMessage('Recipient address required'),
  body('description').optional().trim()
], handleValidation, async (req, res) => {
  try {
    const { walletId, amount, recipientAddress, description } = req.body;

    // Verify wallet ownership
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: req.user.id, isActive: true }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    // Create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        userId: req.user.id,
        walletId: walletId,
        type: 'QR_PAYMENT',
        amount: -amount,
        currency: wallet.currency,
        status: 'PENDING',
        description: description || `QR Payment to ${recipientAddress.slice(0, 10)}...`,
        metadata: {
          recipientAddress,
          paymentMethod: 'QR'
        }
      }
    });

    // For Solana payments, attempt blockchain transaction
    if (wallet.type === 'SOLANA') {
      try {
        // Validate recipient address
        const recipientPublicKey = new PublicKey(recipientAddress);
        
        // Update transaction status to processing
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { 
            status: 'COMPLETED',
            metadata: {
              ...transaction.metadata,
              blockchainTxId: `demo_${Date.now()}` // In production, use real blockchain transaction
            }
          }
        });

        // Deduct from wallet
        await prisma.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amount } }
        });

        logger.info(`QR payment completed: ${amount} ${wallet.currency} to ${recipientAddress} by user ${req.user.email}`);

        res.status(201).json({
          message: 'QR payment completed successfully',
          transaction: {
            ...transaction,
            status: 'COMPLETED'
          }
        });

      } catch (blockchainError) {
        // Update transaction status to failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' }
        });

        logger.error('Blockchain transaction failed:', blockchainError);
        res.status(500).json({
          error: 'Payment failed - blockchain error',
          code: 'BLOCKCHAIN_ERROR'
        });
      }
    } else {
      // For non-Solana wallets, simulate payment
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' }
      });

      await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } }
      });

      res.status(201).json({
        message: 'QR payment completed successfully',
        transaction: {
          ...transaction,
          status: 'COMPLETED'
        }
      });
    }

  } catch (error) {
    logger.error('QR payment error:', error);
    res.status(500).json({
      error: 'QR payment failed',
      code: 'QR_PAYMENT_ERROR'
    });
  }
});

// Get transaction statistics
router.get('/stats/overview', authenticateToken, [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Valid period required')
], handleValidation, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get transaction statistics
    const [totalTransactions, completedTransactions, totalSpent, totalReceived] = await Promise.all([
      prisma.transaction.count({
        where: {
          userId: req.user.id,
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.transaction.count({
        where: {
          userId: req.user.id,
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          status: 'COMPLETED',
          amount: { lt: 0 },
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          status: 'COMPLETED',
          amount: { gt: 0 },
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      })
    ]);

    // Get transaction types breakdown
    const transactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId: req.user.id,
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { type: true },
      _sum: { amount: true }
    });

    res.json({
      period,
      overview: {
        totalTransactions,
        completedTransactions,
        successRate: totalTransactions > 0 ? (completedTransactions / totalTransactions * 100).toFixed(1) : 0,
        totalSpent: Math.abs(totalSpent._sum.amount || 0),
        totalReceived: totalReceived._sum.amount || 0
      },
      breakdown: transactionTypes.map(type => ({
        type: type.type,
        count: type._count.type,
        totalAmount: type._sum.amount || 0
      }))
    });

  } catch (error) {
    logger.error('Transaction stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;
