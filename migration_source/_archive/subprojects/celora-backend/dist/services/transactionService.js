"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const client_1 = require("@prisma/client");
var TransactionType;
(function (TransactionType) {
    TransactionType["PURCHASE"] = "PURCHASE";
    TransactionType["REFUND"] = "REFUND";
})(TransactionType || (TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["REFUNDED"] = "REFUNDED";
})(TransactionStatus || (TransactionStatus = {}));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const cardService_1 = require("./cardService");
const prisma = new client_1.PrismaClient();
class TransactionService {
    static async validateTransaction(params) {
        const card = await prisma.card.findUnique({
            where: { id: params.cardId }
        });
        if (!card) {
            throw new errorHandler_1.AppError(404, 'Card not found');
        }
        if (!card.isActive) {
            throw new errorHandler_1.AppError(400, 'Card is inactive');
        }
        if (card.isLocked) {
            throw new errorHandler_1.AppError(400, 'Card is locked');
        }
        if (card.userId !== params.userId) {
            throw new errorHandler_1.AppError(403, 'Unauthorized card access');
        }
        const isValidPin = await cardService_1.CardService.verifyPin(params.cardId, params.pin);
        if (!isValidPin) {
            throw new errorHandler_1.AppError(401, 'Invalid PIN');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyTransactions = await prisma.transaction.aggregate({
            where: {
                cardId: params.cardId,
                createdAt: { gte: today },
                status: 'COMPLETED'
            },
            _sum: {
                amount: true
            }
        });
        const dailyTotal = (dailyTransactions._sum.amount || 0) + params.amount;
        if (dailyTotal > card.dailyLimit) {
            throw new errorHandler_1.AppError(400, 'Daily limit exceeded');
        }
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyTransactions = await prisma.transaction.aggregate({
            where: {
                cardId: params.cardId,
                createdAt: { gte: firstDayOfMonth },
                status: 'COMPLETED'
            },
            _sum: {
                amount: true
            }
        });
        const monthlyTotal = (monthlyTransactions._sum.amount || 0) + params.amount;
        if (monthlyTotal > card.monthlyLimit) {
            throw new errorHandler_1.AppError(400, 'Monthly limit exceeded');
        }
        if (params.amount > card.balance) {
            throw new errorHandler_1.AppError(400, 'Insufficient funds');
        }
    }
    static async createTransaction(params) {
        try {
            await this.validateTransaction(params);
            const transaction = await prisma.$transaction(async () => {
                const transaction = await prisma.transaction.create({
                    data: {
                        userId: params.userId,
                        cardId: params.cardId,
                        type: TransactionType.PURCHASE,
                        amount: params.amount,
                        currency: params.currency,
                        merchantName: params.merchantName,
                        merchantId: params.merchantId,
                        location: params.location,
                        description: params.description,
                        status: TransactionStatus.PENDING,
                        ipAddress: params.ipAddress,
                        deviceInfo: params.deviceInfo
                    }
                });
                await prisma.card.update({
                    where: { id: params.cardId },
                    data: {
                        balance: { decrement: params.amount },
                        lastUsed: new Date()
                    }
                });
                return await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: TransactionStatus.COMPLETED }
                });
            });
            logger_1.logger.info('Transaction completed', {
                transactionId: transaction.id,
                cardId: params.cardId,
                amount: params.amount,
                currency: params.currency
            });
            return transaction;
        }
        catch (error) {
            logger_1.logger.error('Transaction failed', {
                error,
                cardId: params.cardId,
                amount: params.amount
            });
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            throw new errorHandler_1.AppError(500, 'Could not process transaction');
        }
    }
    static async refundTransaction(transactionId) {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { card: true }
            });
            if (!transaction) {
                throw new errorHandler_1.AppError(404, 'Transaction not found');
            }
            if (transaction.status !== TransactionStatus.COMPLETED) {
                throw new errorHandler_1.AppError(400, 'Transaction cannot be refunded');
            }
            const refund = await prisma.$transaction(async () => {
                const refund = await prisma.transaction.create({
                    data: {
                        userId: transaction.userId,
                        cardId: transaction.cardId,
                        type: TransactionType.REFUND,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        description: `Refund for transaction ${transactionId}`,
                        status: TransactionStatus.COMPLETED,
                        merchantName: transaction.merchantName,
                        merchantId: transaction.merchantId
                    }
                });
                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: { status: TransactionStatus.REFUNDED }
                });
                if (transaction.card) {
                    await prisma.card.update({
                        where: { id: transaction.card.id },
                        data: {
                            balance: { increment: transaction.amount }
                        }
                    });
                }
                return refund;
            });
            logger_1.logger.info('Transaction refunded', {
                originalTransactionId: transactionId,
                refundTransactionId: refund.id,
                amount: transaction.amount
            });
            return refund;
        }
        catch (error) {
            logger_1.logger.error('Refund failed', { error, transactionId });
            throw new errorHandler_1.AppError(500, 'Could not process refund');
        }
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transactionService.js.map