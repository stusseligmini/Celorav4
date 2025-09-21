"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.TooManyRequestsError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let code = error.code || 'INTERNAL_ERROR';
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = 'Authentication required';
    }
    else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        code = 'FORBIDDEN';
    }
    else if (error.name === 'NotFoundError') {
        statusCode = 404;
        code = 'NOT_FOUND';
    }
    else if (error.name === 'ConflictError') {
        statusCode = 409;
        code = 'CONFLICT';
    }
    else if (error.name === 'TooManyRequestsError') {
        statusCode = 429;
        code = 'TOO_MANY_REQUESTS';
    }
    if (error.code?.startsWith('P')) {
        switch (error.code) {
            case 'P2002':
                statusCode = 409;
                code = 'UNIQUE_CONSTRAINT_VIOLATION';
                message = 'A record with this information already exists';
                break;
            case 'P2025':
                statusCode = 404;
                code = 'RECORD_NOT_FOUND';
                message = 'The requested record was not found';
                break;
            default:
                statusCode = 500;
                code = 'DATABASE_ERROR';
                message = 'A database error occurred';
        }
    }
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
        error: code,
        message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };
    if (isDevelopment) {
        errorResponse.stack = error.stack;
        errorResponse.details = error.details;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.statusCode = 401;
        this.code = 'UNAUTHORIZED';
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.statusCode = 403;
        this.code = 'FORBIDDEN';
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.code = 'NOT_FOUND';
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message = 'Resource conflict') {
        super(message);
        this.statusCode = 409;
        this.code = 'CONFLICT';
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class TooManyRequestsError extends Error {
    constructor(message = 'Too many requests') {
        super(message);
        this.statusCode = 429;
        this.code = 'TOO_MANY_REQUESTS';
        this.name = 'TooManyRequestsError';
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map