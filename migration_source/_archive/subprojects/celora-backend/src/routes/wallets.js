const express = require('express');
const { body } = require('express-validator');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

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

// Get user wallets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        balance: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Update SOL wallet balances
    const updatedWallets = await Promise.all(
      wallets.map(async (wallet) => {
        if (wallet.type === 'SOLANA' && wallet.address) {
          try {
            const publicKey = new PublicKey(wallet.address);
            const balance = await solanaConnection.getBalance(publicKey);
            const solBalance = balance / LAMPORTS_PER_SOL;
            
            // Update balance in database
            await prisma.wallet.update({
              where: { id: wallet.id },
              data: { balance: solBalance }
            });
            
            return { ...wallet, balance: solBalance };
          } catch (error) {
            logger.warn(`Failed to update balance for wallet ${wallet.id}:`, error);
            return wallet;
          }
        }
        return wallet;
      })
    );

    res.json({
      wallets: updatedWallets,
      totalWallets: wallets.length
    });

  } catch (error) {
    logger.error('Wallet fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch wallets',
      code: 'WALLET_FETCH_ERROR'
    });
  }
});

// Create new wallet
router.post('/', authenticateToken, [
  body('name').notEmpty().trim().withMessage('Wallet name required'),
  body('type').isIn(['SOLANA', 'BITCOIN', 'ETHEREUM']).withMessage('Valid wallet type required'),
  body('address').notEmpty().trim().withMessage('Wallet address required')
], handleValidation, async (req, res) => {
  try {
    const { name, type, address } = req.body;

    // Validate address format based on type
    if (type === 'SOLANA') {
      try {
        new PublicKey(address);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid Solana address format',
          code: 'INVALID_ADDRESS'
        });
      }
    }

    // Check if address already exists for user
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        userId: req.user.id,
        address: address
      }
    });

    if (existingWallet) {
      return res.status(409).json({
        error: 'Wallet address already exists',
        code: 'WALLET_EXISTS'
      });
    }

    // Get initial balance for Solana
    let initialBalance = 0;
    if (type === 'SOLANA') {
      try {
        const publicKey = new PublicKey(address);
        const balance = await solanaConnection.getBalance(publicKey);
        initialBalance = balance / LAMPORTS_PER_SOL;
      } catch (error) {
        logger.warn('Failed to fetch initial balance:', error);
      }
    }

    // Create wallet
    const wallet = await prisma.wallet.create({
      data: {
        id: uuidv4(),
        userId: req.user.id,
        name,
        type,
        address,
        balance: initialBalance,
        currency: type === 'SOLANA' ? 'SOL' : type === 'BITCOIN' ? 'BTC' : 'ETH',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        balance: true,
        currency: true,
        isActive: true,
        createdAt: true
      }
    });

    logger.info(`New wallet created for user ${req.user.email}: ${type} - ${name}`);

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet
    });

  } catch (error) {
    logger.error('Wallet creation error:', error);
    res.status(500).json({
      error: 'Failed to create wallet',
      code: 'WALLET_CREATE_ERROR'
    });
  }
});

// Get specific wallet
router.get('/:walletId', authenticateToken, async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user.id
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            createdAt: true
          }
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    // Update balance if Solana
    if (wallet.type === 'SOLANA' && wallet.address) {
      try {
        const publicKey = new PublicKey(wallet.address);
        const balance = await solanaConnection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: solBalance }
        });
        
        wallet.balance = solBalance;
      } catch (error) {
        logger.warn(`Failed to update balance for wallet ${walletId}:`, error);
      }
    }

    res.json({ wallet });

  } catch (error) {
    logger.error('Wallet detail fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet details',
      code: 'WALLET_DETAIL_ERROR'
    });
  }
});

// Update wallet
router.put('/:walletId', authenticateToken, [
  body('name').optional().notEmpty().trim()
], handleValidation, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { name } = req.body;

    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user.id
      }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id: walletId },
      data: { name },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        balance: true,
        currency: true,
        updatedAt: true
      }
    });

    logger.info(`Wallet updated: ${walletId} by user ${req.user.email}`);

    res.json({
      message: 'Wallet updated successfully',
      wallet: updatedWallet
    });

  } catch (error) {
    logger.error('Wallet update error:', error);
    res.status(500).json({
      error: 'Failed to update wallet',
      code: 'WALLET_UPDATE_ERROR'
    });
  }
});

// Delete wallet
router.delete('/:walletId', authenticateToken, async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user.id
      }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    // Soft delete - deactivate wallet
    await prisma.wallet.update({
      where: { id: walletId },
      data: { isActive: false }
    });

    logger.info(`Wallet deleted: ${walletId} by user ${req.user.email}`);

    res.json({
      message: 'Wallet deleted successfully'
    });

  } catch (error) {
    logger.error('Wallet deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete wallet',
      code: 'WALLET_DELETE_ERROR'
    });
  }
});

// Get wallet balance history
router.get('/:walletId/balance-history', authenticateToken, async (req, res) => {
  try {
    const { walletId } = req.params;
    const { days = 30 } = req.query;

    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user.id
      }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      });
    }

    // Get balance history from transactions
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const balanceHistory = await prisma.transaction.findMany({
      where: {
        walletId: walletId,
        createdAt: { gte: startDate },
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'asc' },
      select: {
        amount: true,
        type: true,
        createdAt: true
      }
    });

    // Calculate balance over time
    let runningBalance = wallet.balance;
    const history = [];
    
    // Work backwards to calculate historical balances
    for (let i = balanceHistory.length - 1; i >= 0; i--) {
      const tx = balanceHistory[i];
      if (tx.type === 'DEPOSIT') {
        runningBalance -= tx.amount;
      } else if (tx.type === 'WITHDRAWAL') {
        runningBalance += tx.amount;
      }
      history.unshift({
        date: tx.createdAt,
        balance: runningBalance
      });
    }

    res.json({
      walletId,
      currentBalance: wallet.balance,
      history: history.reverse()
    });

  } catch (error) {
    logger.error('Balance history fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch balance history',
      code: 'BALANCE_HISTORY_ERROR'
    });
  }
});

// Get aggregated balance data for dashboard
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user.id },
      select: {
        balance: true,
        currency: true,
        type: true
      }
    });

    // Calculate total balance (assume SOL for now)
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const solBalance = wallets
      .filter(w => w.currency === 'SOL' || w.type === 'MAIN')
      .reduce((sum, wallet) => sum + wallet.balance, 0);

    // Mock monthly change for now (you can implement real calculation later)
    const monthlyChange = `+$${(totalBalance * 0.127).toFixed(2)}`;

    res.json({
      totalBalance: totalBalance.toFixed(2),
      solBalance: solBalance.toFixed(4),
      monthlyChange,
      walletCount: wallets.length
    });

  } catch (error) {
    logger.error('Balance fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch balance data',
      code: 'BALANCE_FETCH_ERROR'
    });
  }
});

// Get wallet holdings/assets
router.get('/holdings', authenticateToken, async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        metadata: true
      }
    });

    // Transform wallets into holdings format
    const holdings = wallets.map(wallet => ({
      id: wallet.id,
      name: wallet.currency === 'SOL' ? 'Solana' : wallet.name,
      symbol: wallet.currency || 'SOL',
      balance: wallet.balance,
      usdValue: wallet.balance * 85, // Mock price for SOL
      color: wallet.currency === 'SOL' ? '#9945FF' : '#6366f1',
      priceChange: '+12.5%' // Mock change
    }));

    res.json(holdings);

  } catch (error) {
    logger.error('Holdings fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch holdings',
      code: 'HOLDINGS_FETCH_ERROR'
    });
  }
});

module.exports = router;
