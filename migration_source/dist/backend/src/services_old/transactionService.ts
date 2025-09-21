import { PrismaClient } from '@prisma/client';

enum TransactionType {
    PURCHASE = 'PURCHASE',
    REFUND = 'REFUND'
}

enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REFUNDED = 'REFUNDED'
}
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { CardService } from './cardService';

const prisma = new PrismaClient();

interface CreateTransactionParams {
    userId: string;
    cardId: string;
    amount: number;
    currency: string;
    merchantName?: string;
    merchantId?: string;
    location?: string;
    description?: string;
    pin: string;
    ipAddress?: string;
    deviceInfo?: string;
}

export class TransactionService {
    static async validateTransaction(params: CreateTransactionParams) {
        const card = await prisma.card.findUnique({
            where: { id: params.cardId }
        });

        if (!card) {
            throw new AppError(404, 'Card not found');
        }

        if (!card.isActive) {
            throw new AppError(400, 'Card is inactive');
        }

        if (card.isLocked) {
            throw new AppError(400, 'Card is locked');
        }

        if (card.userId !== params.userId) {
            throw new AppError(403, 'Unauthorized card access');
        }

        const isValidPin = await CardService.verifyPin(params.cardId, params.pin);
        if (!isValidPin) {
            throw new AppError(401, 'Invalid PIN');
        }

        // Check daily limit
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
            throw new AppError(400, 'Daily limit exceeded');
        }

        // Check monthly limit
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
            throw new AppError(400, 'Monthly limit exceeded');
        }

        // Check balance
        if (params.amount > card.balance) {
            throw new AppError(400, 'Insufficient funds');
        }
    }

    static async createTransaction(params: CreateTransactionParams) {
        try {
            await this.validateTransaction(params);

            const transaction = await prisma.$transaction(async () => {
                // Create the transaction
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

                // Update card balance
                await prisma.card.update({
                    where: { id: params.cardId },
                    data: {
                        balance: { decrement: params.amount },
                        lastUsed: new Date()
                    }
                });

                // Update transaction status
                return await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: TransactionStatus.COMPLETED }
                });
            });

            logger.info('Transaction completed', {
                transactionId: transaction.id,
                cardId: params.cardId,
                amount: params.amount,
                currency: params.currency
            });

            return transaction;
        } catch (error) {
            logger.error('Transaction failed', {
                error,
                cardId: params.cardId,
                amount: params.amount
            });

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(500, 'Could not process transaction');
        }
    }

    static async refundTransaction(transactionId: string) {
        try {
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { card: true }
            });

            if (!transaction) {
                throw new AppError(404, 'Transaction not found');
            }

            if (transaction.status !== TransactionStatus.COMPLETED) {
                throw new AppError(400, 'Transaction cannot be refunded');
            }

            const refund = await prisma.$transaction(async () => {
                // Create refund transaction
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

                // Update original transaction
                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: { status: TransactionStatus.REFUNDED }
                });

                // Restore card balance
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

            logger.info('Transaction refunded', {
                originalTransactionId: transactionId,
                refundTransactionId: refund.id,
                amount: transaction.amount
            });

            return refund;
        } catch (error) {
            logger.error('Refund failed', { error, transactionId });
            throw new AppError(500, 'Could not process refund');
        }
    }
}
