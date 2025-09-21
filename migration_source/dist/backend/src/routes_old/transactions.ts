import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const router = Router();

// Get all transactions for a wallet
router.get('/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const transactions = await prisma.transaction.findMany({
      where: {
        walletAddress
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Create a new transaction
router.post('/', async (req, res, next): Promise<void | Response> => {
  try {
    const { cardId, walletAddress, type, amount } = req.body;

    // Get card details
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Create and sign transaction
    await new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(type === 'deposit' ? walletAddress : card.solanaAddress),
        toPubkey: new PublicKey(type === 'deposit' ? card.solanaAddress : walletAddress),
        lamports: Math.floor(amount * 1e9)
      })
    );

    // Record transaction in database
    const dbTransaction = await prisma.transaction.create({
      data: {
        cardId,
        walletAddress,
        type,
        amount,
        status: 'pending',
        timestamp: new Date()
      }
    });

    res.status(201).json(dbTransaction);
  } catch (error) {
    next(error);
  }
});

export const transactionRoutes = router;
