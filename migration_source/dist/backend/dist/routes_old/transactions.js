"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const web3_js_1 = require("@solana/web3.js");
const router = (0, express_1.Router)();
router.get('/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        const transactions = await prisma_1.prisma.transaction.findMany({
            where: {
                walletAddress
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { cardId, walletAddress, type, amount } = req.body;
        const card = await prisma_1.prisma.card.findUnique({
            where: { id: cardId }
        });
        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }
        await new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: new web3_js_1.PublicKey(type === 'deposit' ? walletAddress : card.solanaAddress),
            toPubkey: new web3_js_1.PublicKey(type === 'deposit' ? card.solanaAddress : walletAddress),
            lamports: Math.floor(amount * 1e9)
        }));
        const dbTransaction = await prisma_1.prisma.transaction.create({
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
    }
    catch (error) {
        next(error);
    }
});
exports.transactionRoutes = router;
//# sourceMappingURL=transactions.js.map