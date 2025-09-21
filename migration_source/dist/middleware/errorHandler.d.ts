import { Request, Response, NextFunction } from 'express';
export interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare const errorHandler: (error: CustomError, req: Request, res: Response, next: NextFunction) => void;
export declare class ValidationError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message: string, details?: any | undefined);
}
export declare class UnauthorizedError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ForbiddenError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class ConflictError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class TooManyRequestsError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map