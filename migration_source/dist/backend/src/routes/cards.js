const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { authenticateToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Generate card number (for demo - in production use proper card issuer)
const generateCardNumber = () => {
  // Generate 16-digit number starting with 4 (Visa format)
  const prefix = '4000';
  const middle = Math.random().toString().slice(2, 12);
  let cardNumber = prefix + middle;
  
  // Add Luhn check digit
  let sum = 0;
  let shouldDouble = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return cardNumber + checkDigit;
};

// Generate CVV
const generateCVV = () => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Generate expiry date (2 years from now)
const generateExpiryDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${year}`;
};

// Mask card number for display
const maskCardNumber = (cardNumber) => {
  return `**** **** **** ${cardNumber.slice(-4)}`;
};

// Get user's virtual cards
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cards = await prisma.virtualCard.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        cardType: true,
        status: true,
        balance: true,
        spendingLimit: true,
        cardNumber: true,
        expiryDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    // Mask card numbers for security
    const maskedCards = cards.map(card => ({
      ...card,
      cardNumber: maskCardNumber(card.cardNumber)
    }));

    res.json({
      cards: maskedCards,
      totalCards: cards.length
    });

  } catch (error) {
    logger.error('Virtual cards fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch virtual cards',
      code: 'CARDS_FETCH_ERROR'
    });
  }
});

// Create new virtual card
router.post('/', authenticateToken, [
  body('name').notEmpty().trim().withMessage('Card name required'),
  body('cardType').isIn(['DEBIT', 'CREDIT', 'PREPAID']).withMessage('Valid card type required'),
  body('spendingLimit').isFloat({ min: 0 }).withMessage('Valid spending limit required')
], handleValidation, async (req, res) => {
  try {
    const { name, cardType, spendingLimit } = req.body;

    // Check if user can create more cards (limit to 10 per user)
    const cardCount = await prisma.virtualCard.count({
      where: { 
        userId: req.user.id,
        isActive: true
      }
    });

    if (cardCount >= 10) {
      return res.status(400).json({
        error: 'Maximum number of cards reached (10)',
        code: 'CARD_LIMIT_EXCEEDED'
      });
    }

    // Generate card details
    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiryDate = generateExpiryDate();

    // Create virtual card
    const card = await prisma.virtualCard.create({
      data: {
        id: uuidv4(),
        userId: req.user.id,
        name,
        cardType,
        cardNumber,
        cvv,
        expiryDate,
        balance: 0,
        spendingLimit: parseFloat(spendingLimit),
        status: 'ACTIVE',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        cardType: true,
        cardNumber: true,
        expiryDate: true,
        balance: true,
        spendingLimit: true,
        status: true,
        createdAt: true
      }
    });

    logger.info(`New virtual card created for user ${req.user.email}: ${name} (${cardType})`);

    res.status(201).json({
      message: 'Virtual card created successfully',
      card: {
        ...card,
        cardNumber: maskCardNumber(card.cardNumber)
      }
    });

  } catch (error) {
    logger.error('Virtual card creation error:', error);
    res.status(500).json({
      error: 'Failed to create virtual card',
      code: 'CARD_CREATE_ERROR'
    });
  }
});

// Get specific virtual card details
router.get('/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: req.user.id
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            description: true,
            merchantName: true,
            createdAt: true
          }
        }
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Virtual card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    // Return full card details for owner
    res.json({ 
      card: {
        ...card,
        cardNumber: maskCardNumber(card.cardNumber)
      }
    });

  } catch (error) {
    logger.error('Virtual card detail fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch card details',
      code: 'CARD_DETAIL_ERROR'
    });
  }
});

// Update virtual card
router.put('/:cardId', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('spendingLimit').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['ACTIVE', 'FROZEN', 'CANCELLED'])
], handleValidation, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { name, spendingLimit, status } = req.body;

    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: req.user.id
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Virtual card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (spendingLimit !== undefined) updateData.spendingLimit = parseFloat(spendingLimit);
    if (status) updateData.status = status;

    const updatedCard = await prisma.virtualCard.update({
      where: { id: cardId },
      data: updateData,
      select: {
        id: true,
        name: true,
        cardType: true,
        cardNumber: true,
        balance: true,
        spendingLimit: true,
        status: true,
        updatedAt: true
      }
    });

    logger.info(`Virtual card updated: ${cardId} by user ${req.user.email}`);

    res.json({
      message: 'Virtual card updated successfully',
      card: {
        ...updatedCard,
        cardNumber: maskCardNumber(updatedCard.cardNumber)
      }
    });

  } catch (error) {
    logger.error('Virtual card update error:', error);
    res.status(500).json({
      error: 'Failed to update virtual card',
      code: 'CARD_UPDATE_ERROR'
    });
  }
});

// Delete virtual card
router.delete('/:cardId', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: req.user.id
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Virtual card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    // Check if card has balance
    if (card.balance > 0) {
      return res.status(400).json({
        error: 'Cannot delete card with remaining balance',
        code: 'CARD_HAS_BALANCE'
      });
    }

    // Soft delete - deactivate card
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { 
        status: 'CANCELLED',
        isActive: false 
      }
    });

    logger.info(`Virtual card deleted: ${cardId} by user ${req.user.email}`);

    res.json({
      message: 'Virtual card deleted successfully'
    });

  } catch (error) {
    logger.error('Virtual card deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete virtual card',
      code: 'CARD_DELETE_ERROR'
    });
  }
});

// Add funds to virtual card
router.post('/:cardId/add-funds', authenticateToken, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
  body('walletId').notEmpty().withMessage('Source wallet ID required')
], handleValidation, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { amount, walletId } = req.body;

    // Verify card ownership
    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Active virtual card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    // Verify wallet ownership and balance
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user.id,
        isActive: true
      }
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

    // Perform transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } }
      });

      // Add to card
      await tx.virtualCard.update({
        where: { id: cardId },
        data: { balance: { increment: amount } }
      });

      // Create transaction records
      await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId: req.user.id,
          walletId: walletId,
          type: 'WITHDRAWAL',
          amount: amount,
          currency: wallet.currency,
          status: 'COMPLETED',
          description: `Transfer to virtual card: ${card.name}`
        }
      });

      await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId: req.user.id,
          virtualCardId: cardId,
          type: 'CARD_LOAD',
          amount: amount,
          currency: 'USD',
          status: 'COMPLETED',
          description: `Funds added from ${wallet.name}`
        }
      });

      return await tx.virtualCard.findUnique({
        where: { id: cardId },
        select: {
          id: true,
          name: true,
          balance: true,
          cardNumber: true
        }
      });
    });

    logger.info(`Funds added to virtual card ${cardId}: $${amount} by user ${req.user.email}`);

    res.json({
      message: 'Funds added successfully',
      card: {
        ...result,
        cardNumber: maskCardNumber(result.cardNumber)
      },
      amountAdded: amount
    });

  } catch (error) {
    logger.error('Add funds error:', error);
    res.status(500).json({
      error: 'Failed to add funds',
      code: 'ADD_FUNDS_ERROR'
    });
  }
});

// Freeze/unfreeze virtual card
router.post('/:cardId/freeze', authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await prisma.virtualCard.findFirst({
      where: {
        id: cardId,
        userId: req.user.id
      }
    });

    if (!card) {
      return res.status(404).json({
        error: 'Virtual card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    const newStatus = card.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';

    const updatedCard = await prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: newStatus },
      select: {
        id: true,
        name: true,
        status: true,
        cardNumber: true
      }
    });

    logger.info(`Virtual card ${newStatus.toLowerCase()}: ${cardId} by user ${req.user.email}`);

    res.json({
      message: `Card ${newStatus.toLowerCase()} successfully`,
      card: {
        ...updatedCard,
        cardNumber: maskCardNumber(updatedCard.cardNumber)
      }
    });

  } catch (error) {
    logger.error('Card freeze/unfreeze error:', error);
    res.status(500).json({
      error: 'Failed to update card status',
      code: 'CARD_STATUS_ERROR'
    });
  }
});

module.exports = router;
