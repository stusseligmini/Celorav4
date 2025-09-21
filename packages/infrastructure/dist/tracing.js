"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingManager = exports.RequestContext = void 0;
exports.traced = traced;
const logger_1 = require("./logger");
class TracingManager {
    static instance;
    spans = new Map();
    isEnabled = process.env.TRACING_ENABLED === 'true';
    static getInstance() {
        if (!TracingManager.instance) {
            TracingManager.instance = new TracingManager();
        }
        return TracingManager.instance;
    }
    createSpan(options, context) {
        const traceId = context?.traceId || this.generateId();
        const spanId = this.generateId();
        const correlationId = context?.correlationId || this.generateId();
        const span = {
            traceId,
            spanId,
            parentSpanId: context?.parentSpanId,
            correlationId,
            operation: options.operation,
            tags: options.tags || {},
            metadata: options.metadata || {},
            startTime: Date.now(),
            status: 'started'
        };
        if (this.isEnabled) {
            this.spans.set(spanId, span);
            logger_1.logger.info({
                trace_id: traceId,
                span_id: spanId,
                parent_span_id: context?.parentSpanId,
                correlation_id: correlationId,
                operation: options.operation,
                event: 'span_started'
            }, `Started span: ${options.operation}`);
        }
        return { traceId, spanId, parentSpanId: context?.parentSpanId, correlationId };
    }
    finishSpan(context, status = 'success', error) {
        if (!this.isEnabled)
            return;
        const span = this.spans.get(context.spanId);
        if (!span)
            return;
        span.endTime = Date.now();
        span.duration = span.endTime - span.startTime;
        span.status = status;
        if (error)
            span.error = error.message;
        logger_1.logger.info({
            trace_id: context.traceId,
            span_id: context.spanId,
            parent_span_id: context.parentSpanId,
            correlation_id: context.correlationId,
            operation: span.operation,
            duration: span.duration,
            status,
            error: error?.message,
            event: 'span_finished'
        }, `Finished span: ${span.operation} (${span.duration}ms)`);
        this.spans.delete(context.spanId);
    }
    addSpanEvent(context, event, attributes) {
        if (!this.isEnabled)
            return;
        logger_1.logger.info({
            trace_id: context.traceId,
            span_id: context.spanId,
            correlation_id: context.correlationId,
            event,
            attributes,
            timestamp: Date.now()
        }, `Span event: ${event}`);
    }
    generateId() {
        return Math.random().toString(36).substr(2, 16);
    }
}
exports.TracingManager = TracingManager;
// Decorator for automatic span creation
function traced(operation, tags) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const tracer = TracingManager.getInstance();
            const context = tracer.createSpan({ operation, tags });
            try {
                tracer.addSpanEvent(context, 'method_start', { args: args.slice(0, 2) }); // Don't log all args for security
                const result = await originalMethod.apply(this, args);
                tracer.addSpanEvent(context, 'method_success');
                tracer.finishSpan(context, 'success');
                return result;
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                tracer.addSpanEvent(context, 'method_error', { error: err.message });
                tracer.finishSpan(context, 'error', err);
                throw error;
            }
        };
        return descriptor;
    };
}
// Context provider for request correlation
class RequestContext {
    static storage = new Map();
    static set(requestId, context) {
        this.storage.set(requestId, context);
    }
    static get(requestId) {
        return this.storage.get(requestId);
    }
    static clear(requestId) {
        this.storage.delete(requestId);
    }
}
exports.RequestContext = RequestContext;
