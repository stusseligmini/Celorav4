"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundingBridge = void 0;
const logger_1 = require("./logger");
class FundingBridge {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async fundVirtualCard(req) {
        const child = logger_1.logger.child({
            corr: req.correlationId || crypto.randomUUID(),
            card: req.targetCardId,
            sourceType: req.sourceType
        });
        try {
            child.info({ amount: req.amount, currency: req.currency }, 'Funding initiated');
            const result = await this.supabaseService.addFunds({
                cardId: req.targetCardId,
                amount: req.amount,
                currency: req.currency,
                sourceType: req.sourceType
            });
            if (result.success) {
                child.info({ transactionId: result.transactionId }, 'Funding completed successfully');
                return { success: true, transactionId: result.transactionId };
            }
            child.error({ reason: result.reason }, 'Funding failed');
            return { success: false, reason: result.reason };
        }
        catch (err) {
            child.error({ err }, 'Funding failed');
            return { success: false, reason: err.message };
        }
    }
}
exports.FundingBridge = FundingBridge;
