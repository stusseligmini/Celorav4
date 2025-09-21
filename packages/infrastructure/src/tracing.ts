import { logger } from './logger';

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
}

interface SpanOptions {
  operation: string;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
}

class TracingManager {
  private static instance: TracingManager;
  private spans: Map<string, any> = new Map();
  private isEnabled: boolean = process.env.TRACING_ENABLED === 'true';

  static getInstance(): TracingManager {
    if (!TracingManager.instance) {
      TracingManager.instance = new TracingManager();
    }
    return TracingManager.instance;
  }

  createSpan(options: SpanOptions, context?: Partial<TraceContext>): TraceContext {
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
      logger.info({
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

  finishSpan(context: TraceContext, status: 'success' | 'error' = 'success', error?: Error) {
    if (!this.isEnabled) return;

    const span = this.spans.get(context.spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    if (error) span.error = error.message;

    logger.info({
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

  addSpanEvent(context: TraceContext, event: string, attributes?: Record<string, any>) {
    if (!this.isEnabled) return;

    logger.info({
      trace_id: context.traceId,
      span_id: context.spanId,
      correlation_id: context.correlationId,
      event,
      attributes,
      timestamp: Date.now()
    }, `Span event: ${event}`);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

// Decorator for automatic span creation
export function traced(operation: string, tags?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracer = TracingManager.getInstance();
      const context = tracer.createSpan({ operation, tags });

      try {
        tracer.addSpanEvent(context, 'method_start', { args: args.slice(0, 2) }); // Don't log all args for security
        const result = await originalMethod.apply(this, args);
        tracer.addSpanEvent(context, 'method_success');
        tracer.finishSpan(context, 'success');
        return result;
      } catch (error) {
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
export class RequestContext {
  private static storage = new Map<string, TraceContext>();

  static set(requestId: string, context: TraceContext) {
    this.storage.set(requestId, context);
  }

  static get(requestId: string): TraceContext | undefined {
    return this.storage.get(requestId);
  }

  static clear(requestId: string) {
    this.storage.delete(requestId);
  }
}

export { TracingManager, type TraceContext, type SpanOptions };