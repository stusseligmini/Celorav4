import { RotationResult } from './kmsService';
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
export declare class KeyRotationScheduler {
    private checkInterval;
    private intervalId;
    private isRunning;
    private checkIntervalMs;
    private rotationHistory;
    constructor(checkInterval?: number);
    /**
     * Start the rotation scheduler
     */
    start(): void;
    /**
     * Stop the rotation scheduler
     */
    stop(): void;
    /**
     * Check if rotation is needed and perform it
     */
    private checkAndRotate;
    /**
     * Manually trigger key rotation
     */
    manualRotation(): Promise<RotationResult>;
    /**
     * Trigger emergency key rotation
     */
    emergencyRotation(trigger: string): Promise<RotationResult>;
    /**
     * Get rotation history
     */
    getRotationHistory(): RotationEvent[];
    /**
     * Get scheduler status
     */
    getStatus(): {
        isRunning: boolean;
        checkInterval: number;
        lastCheck: Date | null;
        totalRotations: number;
    };
    /**
     * Keep only recent rotation history (last 100 events)
     */
    private pruneHistory;
    /**
     * Check if emergency rotation is needed based on external signals
     */
    checkEmergencyTriggers(signals: string[]): Promise<boolean>;
}
export declare const keyRotationScheduler: KeyRotationScheduler;
