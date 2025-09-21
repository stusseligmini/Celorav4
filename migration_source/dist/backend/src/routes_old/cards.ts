import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';
const connection = new Connection('https://api.devnet.solana.com');

const router = Router();

// Get all cards for a wallet
router.get('/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const cards = await prisma.card.findMany({
      where: {
        walletAddress
      }
    });

    // Get real-time SOL balance for each card
    const cardsWithBalance = await Promise.all(
      cards.map(async (card: { solanaAddress: string }) => {
        const balance = await connection.getBalance(new PublicKey(card.solanaAddress));
        return {
          ...card,
          balance: balance / 1e9 // Convert lamports to SOL
        };
      })
    );

    res.json(cardsWithBalance);
  } catch (error) {
    next(error);
  }
});

// Create a new card
router.post('/', async (req, res, next) => {
  try {
    const { walletAddress, name } = req.body;

    const card = await prisma.card.create({
      data: {
        walletAddress,
        name,
        status: 'active',
        solanaAddress: '' // Generate new Solana address here
      }
    });

    res.status(201).json(card);
  } catch (error) {
    next(error);
  }
});

// Update card status
router.patch('/:cardId/status', async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;

    const card = await prisma.card.update({
      where: { id: cardId },
      data: { status }
    });

    res.json(card);
  } catch (error) {
    next(error);
  }
});

export const cardRoutes = router;
