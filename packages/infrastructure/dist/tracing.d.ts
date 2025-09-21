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
declare class TracingManager {
    private static instance;
    private spans;
    private isEnabled;
    static getInstance(): TracingManager;
    createSpan(options: SpanOptions, context?: Partial<TraceContext>): TraceContext;
    finishSpan(context: TraceContext, status?: 'success' | 'error', error?: Error): void;
    addSpanEvent(context: TraceContext, event: string, attributes?: Record<string, any>): void;
    private generateId;
}
export declare function traced(operation: string, tags?: Record<string, any>): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare class RequestContext {
    private static storage;
    static set(requestId: string, context: TraceContext): void;
    static get(requestId: string): TraceContext | undefined;
    static clear(requestId: string): void;
}
export { TracingManager, type TraceContext, type SpanOptions };
