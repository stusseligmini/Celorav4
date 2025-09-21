"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
exports.withTracing = withTracing;
exports.createHealthCheck = createHealthCheck;
const tracing_1 = require("./tracing");
function withTracing(handler, operationName) {
    return (async (req, ...args) => {
        const tracer = tracing_1.TracingManager.getInstance();
        const correlationId = req.headers.get('x-correlation-id') || 'unknown';
        const context = tracer.createSpan({
            operation: operationName,
            tags: {
                method: req.method,
                url: req.url,
                userAgent: req.headers.get('user-agent')
            }
        }, { correlationId });
        try {
            tracer.addSpanEvent(context, 'request_start', {
                method: req.method,
                path: new URL(req.url).pathname
            });
            const response = await handler(req, ...args);
            tracer.addSpanEvent(context, 'request_success', {
                status: response.status || 200
            });
            tracer.finishSpan(context, 'success');
            // Add correlation ID to response headers
            response.headers?.set('x-correlation-id', correlationId);
            return response;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            tracer.addSpanEvent(context, 'request_error', {
                error: err.message,
                stack: err.stack
            });
            tracer.finishSpan(context, 'error', err);
            throw error;
        }
    });
}
// Performance monitoring for database operations
class PerformanceMonitor {
    static metrics = new Map();
    static recordMetric(operation, duration) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        const values = this.metrics.get(operation);
        values.push(duration);
        // Keep only last 100 measurements
        if (values.length > 100) {
            values.shift();
        }
    }
    static getMetrics(operation) {
        const values = this.metrics.get(operation) || [];
        if (values.length === 0)
            return null;
        const sorted = [...values].sort((a, b) => a - b);
        return {
            count: values.length,
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    static getAllMetrics() {
        const result = {};
        for (const [operation, _] of this.metrics) {
            result[operation] = this.getMetrics(operation);
        }
        return result;
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Health check endpoint logic
function createHealthCheck() {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        metrics: PerformanceMonitor.getAllMetrics()
    };
}
