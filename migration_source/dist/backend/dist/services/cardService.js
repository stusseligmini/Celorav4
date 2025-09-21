"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class CardService {
    static async generateCardNumber() {
        const prefix = '4532';
        let number = prefix;
        for (let i = 0; i < 11; i++) {
            number += Math.floor(Math.random() * 10).toString();
        }
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
    static async createVirtualCard(userId, pin) {
        try {
            const cardNumber = await this.generateCardNumber();
            const pinHash = await bcryptjs_1.default.hash(pin, 10);
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
                    dailyLimit: 1000,
                    monthlyLimit: 5000,
                }
            });
            logger_1.logger.info('Virtual card created', {
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
        }
        catch (error) {
            logger_1.logger.error('Error creating virtual card', { error, userId });
            throw new errorHandler_1.AppError(500, 'Could not create virtual card');
        }
    }
    static async verifyPin(cardId, pin) {
        try {
            const card = await prisma.card.findUnique({
                where: { id: cardId }
            });
            if (!card) {
                throw new errorHandler_1.AppError(404, 'Card not found');
            }
            return bcryptjs_1.default.compare(pin, card.pinHash);
        }
        catch (error) {
            logger_1.logger.error('Error verifying PIN', { error, cardId });
            throw new errorHandler_1.AppError(500, 'Could not verify PIN');
        }
    }
    static async lockCard(cardId, reason) {
        try {
            const card = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isLocked: true,
                    lockReason: reason
                }
            });
            logger_1.logger.info('Card locked', {
                cardId,
                reason
            });
            return card;
        }
        catch (error) {
            logger_1.logger.error('Error locking card', { error, cardId });
            throw new errorHandler_1.AppError(500, 'Could not lock card');
        }
    }
    static async unlockCard(cardId) {
        try {
            const card = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isLocked: false,
                    lockReason: null
                }
            });
            logger_1.logger.info('Card unlocked', { cardId });
            return card;
        }
        catch (error) {
            logger_1.logger.error('Error unlocking card', { error, cardId });
            throw new errorHandler_1.AppError(500, 'Could not unlock card');
        }
    }
}
exports.CardService = CardService;
//# sourceMappingURL=cardService.js.map