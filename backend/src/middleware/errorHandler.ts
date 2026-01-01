import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Log the error
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
    } else if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
    } else if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced resource does not exist';
    }
    
    // Send error response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack
        })
    });
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    const error = new Error(`Route not found: ${req.method} ${req.path}`);
    (error as any).statusCode = 404;
    next(error);
}

/**
 * Async handler wrapper
 */
export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
