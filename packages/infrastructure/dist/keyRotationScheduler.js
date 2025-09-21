"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyRotationScheduler = exports.KeyRotationScheduler = void 0;
const logger_1 = require("./logger");
const kmsService_1 = require("./kmsService");
/**
 * Key Rotation Scheduler
 * Monitors rotation schedule and automatically rotates keys when needed
 */
class KeyRotationScheduler {
    checkInterval;
    intervalId = null;
    isRunning = false;
    checkIntervalMs = 60 * 1000; // Check every minute
    rotationHistory = [];
    constructor(checkInterval = 60000) {
        this.checkInterval = checkInterval;
        this.checkIntervalMs = checkInterval;
    }
    /**
     * Start the rotation scheduler
     */
    start() {
        if (this.isRunning) {
            logger_1.logger.warn('Key rotation scheduler is already running');
            return;
        }
        if (typeof window !== 'undefined') {
            logger_1.logger.warn('Key rotation scheduler should not run on client side');
            return;
        }
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.checkAndRotate().catch(error => {
                logger_1.logger.error({ error: error.message }, 'Error in key rotation check');
            });
        }, this.checkIntervalMs);
        logger_1.logger.info({ intervalMs: this.checkIntervalMs }, 'Key rotation scheduler started');
    }
    /**
     * Stop the rotation scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        logger_1.logger.info('Key rotation scheduler stopped');
    }
    /**
     * Check if rotation is needed and perform it
     */
    async checkAndRotate() {
        try {
            const needsRotation = await kmsService_1.kmsService.checkRotationNeeded();
            if (needsRotation) {
                logger_1.logger.info('Key rotation needed, initiating rotation');
                const result = await kmsService_1.kmsService.rotateKeys('scheduled');
                const event = {
                    timestamp: new Date(),
                    type: 'scheduled',
                    result
                };
                this.rotationHistory.push(event);
                this.pruneHistory();
                logger_1.logger.info({
                    newKeyId: result.newKeyId,
                    newVersion: result.newVersion,
                    reason: result.reason
                }, 'Scheduled key rotation completed');
            }
        }
        catch (error) {
            logger_1.logger.error({ error: error.message }, 'Failed to perform scheduled key rotation');
        }
    }
    /**
     * Manually trigger key rotation
     */
    async manualRotation() {
        try {
            const result = await kmsService_1.kmsService.rotateKeys('manual');
            const event = {
                timestamp: new Date(),
                type: 'manual',
                result
            };
            this.rotationHistory.push(event);
            this.pruneHistory();
            logger_1.logger.info({
                newKeyId: result.newKeyId,
                newVersion: result.newVersion
            }, 'Manual key rotation completed');
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error: error.message }, 'Failed to perform manual key rotation');
            throw error;
        }
    }
    /**
     * Trigger emergency key rotation
     */
    async emergencyRotation(trigger) {
        try {
            const result = await kmsService_1.kmsService.emergencyRotation(trigger);
            const event = {
                timestamp: new Date(),
                type: 'emergency',
                trigger,
                result
            };
            this.rotationHistory.push(event);
            this.pruneHistory();
            logger_1.logger.warn({
                trigger,
                newKeyId: result.newKeyId,
                newVersion: result.newVersion
            }, 'Emergency key rotation completed');
            return result;
        }
        catch (error) {
            logger_1.logger.error({
                trigger,
                error: error.message
            }, 'Failed to perform emergency key rotation');
            throw error;
        }
    }
    /**
     * Get rotation history
     */
    getRotationHistory() {
        return [...this.rotationHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            checkInterval: this.checkIntervalMs,
            lastCheck: this.rotationHistory.length > 0 ?
                this.rotationHistory[this.rotationHistory.length - 1].timestamp : null,
            totalRotations: this.rotationHistory.length
        };
    }
    /**
     * Keep only recent rotation history (last 100 events)
     */
    pruneHistory() {
        if (this.rotationHistory.length > 100) {
            this.rotationHistory = this.rotationHistory.slice(-100);
        }
    }
    /**
     * Check if emergency rotation is needed based on external signals
     */
    async checkEmergencyTriggers(signals) {
        try {
            const schedule = kmsService_1.kmsService['keyRegistry'].getRotationSchedule();
            if (!schedule?.emergencyRotation?.enabled) {
                return false;
            }
            const triggers = schedule.emergencyRotation.triggers;
            const matchedTriggers = signals.filter(signal => triggers.includes(signal));
            if (matchedTriggers.length > 0) {
                logger_1.logger.warn({ triggers: matchedTriggers }, 'Emergency rotation triggers detected');
                // Perform emergency rotation for the first matched trigger
                await this.emergencyRotation(matchedTriggers[0]);
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error({ error: error.message }, 'Error checking emergency triggers');
            return false;
        }
    }
}
exports.KeyRotationScheduler = KeyRotationScheduler;
// Global scheduler instance
exports.keyRotationScheduler = new KeyRotationScheduler();
