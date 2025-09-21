import { NextResponse } from 'next/server';
export declare function withTracing<T extends (...args: any[]) => Promise<NextResponse>>(handler: T, operationName: string): T;
export declare class PerformanceMonitor {
    private static metrics;
    static recordMetric(operation: string, duration: number): void;
    static getMetrics(operation: string): {
        count: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    } | null;
    static getAllMetrics(): Record<string, any>;
}
export declare function createHealthCheck(): {
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
    environment: string;
    metrics: Record<string, any>;
};
