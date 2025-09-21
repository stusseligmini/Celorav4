import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class CardService {
    static async generateCardNumber(): Promise<string> {
        // Generate a valid card number using Luhn algorithm
        const prefix = '4532'; // Example prefix for virtual cards
        let number = prefix;
        for (let i = 0; i < 11; i++) {
            number += Math.floor(Math.random() * 10).toString();
        }

        // Calculate checksum using Luhn algorithm
        let sum = 0;
        let isEven = false;
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i]);
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            isEven = !isEven;
        }
        const checksum = ((Math.floor(sum / 10) + 1) * 10 - sum) % 10;
        return number + checksum.toString();
    }

    static async createVirtualCard(userId: string, pin: string) {
        try {
            const cardNumber = await this.generateCardNumber();
            const pinHash = await bcrypt.hash(pin, 10);

            const now = new Date();
            const expiryYear = now.getFullYear() + 3;
            const expiryMonth = now.getMonth() + 1;

            const card = await prisma.card.create({
                data: {
                    userId,
                    cardNumber,
                    cardType: 'VIRTUAL',
                    expiryMonth,
                    expiryYear,
                    pinHash,
                    dailyLimit: 1000, // Default daily limit
                    monthlyLimit: 5000, // Default monthly limit
                }
            });

            logger.info('Virtual card created', {
                userId,
                cardId: card.id,
                cardType: 'VIRTUAL'
            });

            return {
                id: card.id,
                cardNumber,
                expiryMonth,
                expiryYear,
                type: 'VIRTUAL'
            };
        } catch (error) {
            logger.error('Error creating virtual card', { error, userId });
            throw new AppError(500, 'Could not create virtual card');
        }
    }

    static async verifyPin(cardId: string, pin: string): Promise<boolean> {
        try {
            const card = await prisma.card.findUnique({
                where: { id: cardId }
            });

            if (!card) {
                throw new AppError(404, 'Card not found');
            }

            return bcrypt.compare(pin, card.pinHash);
        } catch (error) {
            logger.error('Error verifying PIN', { error, cardId });
            throw new AppError(500, 'Could not verify PIN');
        }
    }

    static async lockCard(cardId: string, reason: string) {
        try {
            const card = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isLocked: true,
                    lockReason: reason
                }
            });

            logger.info('Card locked', {
                cardId,
                reason
            });

            return card;
        } catch (error) {
            logger.error('Error locking card', { error, cardId });
            throw new AppError(500, 'Could not lock card');
        }
    }

    static async unlockCard(cardId: string) {
        try {
            const card = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isLocked: false,
                    lockReason: null
                }
            });

            logger.info('Card unlocked', { cardId });

            return card;
        } catch (error) {
            logger.error('Error unlocking card', { error, cardId });
            throw new AppError(500, 'Could not unlock card');
        }
    }
}
