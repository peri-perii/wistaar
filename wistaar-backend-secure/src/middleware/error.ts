/**
 * @fileoverview Error handling middleware for Express
 * Centralizes error handling and response formatting
 * @module middleware/error
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Custom application error class
 * @class AppError
 */
export class AppError extends Error {
  /**
   * Create app error
   * @constructor
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for client
   * @param {any} details - Additional error details
   */
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details: any = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware
 * Must be registered last in middleware chain
 * @function errorHandler
 * @param {any} error - The error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', {
    message: error.message,
    code: error.code,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // Handle AppError with custom status codes
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: {
        code: error.code,
        details: error.details || error.message,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Prisma errors
  if (error.code?.startsWith('P')) {
    handlePrismaError(error, res);
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: {
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle Prisma-specific errors
 * @function handlePrismaError
 * @param {any} error - Prisma error
 * @param {Response} res - Express response
 */
function handlePrismaError(error: any, res: Response): void {
  const prismaErrorMap: Record<string, { statusCode: number; code: string; message: string }> = {
    P2000: {
      statusCode: 400,
      code: 'INVALID_VALUE',
      message: 'The provided value for the column is too long for the column type',
    },
    P2002: {
      statusCode: 409,
      code: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'Unique constraint failed on column',
    },
    P2025: {
      statusCode: 404,
      code: 'RECORD_NOT_FOUND',
      message: 'Record not found',
    },
    P2003: {
      statusCode: 400,
      code: 'FOREIGN_KEY_CONSTRAINT_ERROR',
      message: 'Foreign key constraint failed',
    },
  };

  const mappedError = prismaErrorMap[error.code];

  if (mappedError) {
    res.status(mappedError.statusCode).json({
      success: false,
      message: mappedError.message,
      error: {
        code: mappedError.code,
        details: error.meta?.message || mappedError.message,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: {
        code: 'DATABASE_ERROR',
        details: 'An error occurred while accessing the database',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Async error wrapper to catch Promise rejections
 * @function asyncHandler
 * @async
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware function
 * @example
 * router.post('/login', asyncHandler(async (req, res) => {
 *   // async code here
 * }));
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be registered after all other routes
 * @function notFoundHandler
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Resource not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: 'Resource not found',
    error: {
      code: 'NOT_FOUND',
      details: `${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request logging middleware
 * Logs all incoming requests
 * @function requestLogger
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalJson(data);
  };

  next();
}
