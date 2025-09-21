"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const web3_js_1 = require("@solana/web3.js");
const connection = new web3_js_1.Connection('https://api.devnet.solana.com');
const router = (0, express_1.Router)();
router.get('/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        const cards = await prisma_1.prisma.card.findMany({
            where: {
                walletAddress
            }
        });
        const cardsWithBalance = await Promise.all(cards.map(async (card) => {
            const balance = await connection.getBalance(new web3_js_1.PublicKey(card.solanaAddress));
            return {
                ...card,
                balance: balance / 1e9
            };
        }));
        res.json(cardsWithBalance);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { walletAddress, name } = req.body;
        const card = await prisma_1.prisma.card.create({
            data: {
                walletAddress,
                name,
                status: 'active',
                solanaAddress: ''
            }
        });
        res.status(201).json(card);
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:cardId/status', async (req, res, next) => {
    try {
        const { cardId } = req.params;
        const { status } = req.body;
        const card = await prisma_1.prisma.card.update({
            where: { id: cardId },
            data: { status }
        });
        res.json(card);
    }
    catch (error) {
        next(error);
    }
});
exports.cardRoutes = router;
//# sourceMappingURL=cards.js.map