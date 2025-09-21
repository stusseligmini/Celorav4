import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export declare function withRequestContext<T extends object>(context: T): pino.Logger<never, boolean>;
