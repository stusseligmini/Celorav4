import { logger } from './logger';
import { kmsService, RotationResult } from './kmsService';

export interface RotationEvent {
  timestamp: Date;
  type: 'scheduled' | 'emergency' | 'manual';
  trigger?: string;
  result: RotationResult;
}

/**
 * Key Rotation Scheduler
 * Monitors rotation schedule and automatically rotates keys when needed
 */
export class KeyRotationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs = 60 * 1000; // Check every minute
  private rotationHistory: RotationEvent[] = [];

  constructor(private checkInterval = 60000) {
    this.checkIntervalMs = checkInterval;
  }

  /**
   * Start the rotation scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Key rotation scheduler is already running');
      return;
    }

    if (typeof window !== 'undefined') {
      logger.warn('Key rotation scheduler should not run on client side');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndRotate().catch(error => {
        logger.error({ error: (error as Error).message }, 'Error in key rotation check');
      });
    }, this.checkIntervalMs);

    logger.info({ intervalMs: this.checkIntervalMs }, 'Key rotation scheduler started');
  }

  /**
   * Stop the rotation scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Key rotation scheduler stopped');
  }

  /**
   * Check if rotation is needed and perform it
   */
  private async checkAndRotate(): Promise<void> {
    try {
      const needsRotation = await kmsService.checkRotationNeeded();
      
      if (needsRotation) {
        logger.info('Key rotation needed, initiating rotation');
        
        const result = await kmsService.rotateKeys('scheduled');
        
        const event: RotationEvent = {
          timestamp: new Date(),
          type: 'scheduled',
          result
        };
        
        this.rotationHistory.push(event);
        this.pruneHistory();
        
        logger.info({
          newKeyId: result.newKeyId,
          newVersion: result.newVersion,
          reason: result.reason
        }, 'Scheduled key rotation completed');
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to perform scheduled key rotation');
    }
  }

  /**
   * Manually trigger key rotation
   */
  async manualRotation(): Promise<RotationResult> {
    try {
      const result = await kmsService.rotateKeys('manual');
      
      const event: RotationEvent = {
        timestamp: new Date(),
        type: 'manual',
        result
      };
      
      this.rotationHistory.push(event);
      this.pruneHistory();
      
      logger.info({
        newKeyId: result.newKeyId,
        newVersion: result.newVersion
      }, 'Manual key rotation completed');
      
      return result;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to perform manual key rotation');
      throw error;
    }
  }

  /**
   * Trigger emergency key rotation
   */
  async emergencyRotation(trigger: string): Promise<RotationResult> {
    try {
      const result = await kmsService.emergencyRotation(trigger);
      
      const event: RotationEvent = {
        timestamp: new Date(),
        type: 'emergency',
        trigger,
        result
      };
      
      this.rotationHistory.push(event);
      this.pruneHistory();
      
      logger.warn({
        trigger,
        newKeyId: result.newKeyId,
        newVersion: result.newVersion
      }, 'Emergency key rotation completed');
      
      return result;
    } catch (error) {
      logger.error({ 
        trigger,
        error: (error as Error).message 
      }, 'Failed to perform emergency key rotation');
      throw error;
    }
  }

  /**
   * Get rotation history
   */
  getRotationHistory(): RotationEvent[] {
    return [...this.rotationHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    checkInterval: number;
    lastCheck: Date | null;
    totalRotations: number;
  } {
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
  private pruneHistory(): void {
    if (this.rotationHistory.length > 100) {
      this.rotationHistory = this.rotationHistory.slice(-100);
    }
  }

  /**
   * Check if emergency rotation is needed based on external signals
   */
  async checkEmergencyTriggers(signals: string[]): Promise<boolean> {
    try {
      const schedule = kmsService['keyRegistry'].getRotationSchedule();
      if (!schedule?.emergencyRotation?.enabled) {
        return false;
      }

      const triggers = schedule.emergencyRotation.triggers;
      const matchedTriggers = signals.filter(signal => triggers.includes(signal));
      
      if (matchedTriggers.length > 0) {
        logger.warn({ triggers: matchedTriggers }, 'Emergency rotation triggers detected');
        
        // Perform emergency rotation for the first matched trigger
        await this.emergencyRotation(matchedTriggers[0]);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Error checking emergency triggers');
      return false;
    }
  }
}

// Global scheduler instance
export const keyRotationScheduler = new KeyRotationScheduler();