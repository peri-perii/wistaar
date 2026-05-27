/**
 * @fileoverview Input validation and sanitization middleware using Zod
 * Validates all incoming request data
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Request validation middleware factory
 * Validates request body, params, and query against Zod schemas
 * @function validate
 * @param {Object} schemas - Zod schemas for different parts of request
 * @param {ZodSchema} [schemas.body] - Schema for request body
 * @param {ZodSchema} [schemas.params] - Schema for URL parameters
 * @param {ZodSchema} [schemas.query] - Schema for query parameters
 * @returns {Function} Express middleware function
 * @example
 * const schemas = {
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   })
 * };
 * router.post('/login', validate(schemas), controller);
 */
export function validate(schemas: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Record<string, any> = {};

      const bodySchema = schemas.body || (schemas.shape && schemas.shape.body);
      const paramsSchema = schemas.params || (schemas.shape && schemas.shape.params);
      const querySchema = schemas.query || (schemas.shape && schemas.shape.query);

      // Validate body
      if (bodySchema) {
        try {
          const validatedBody = bodySchema.parse(req.body);
          req.body = validatedBody;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.body = error.errors;
          }
        }
      }

      // Validate params
      if (paramsSchema) {
        try {
          const validatedParams = paramsSchema.parse(req.params);
          req.params = validatedParams;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.params = error.errors;
          }
        }
      }

      // Validate query
      if (querySchema) {
        try {
          const validatedQuery = querySchema.parse(req.query);
          req.query = validatedQuery;
        } catch (error) {
          if (error instanceof ZodError) {
            errors.query = error.errors;
          }
        }
      }

      // If there are errors, return validation error response
      if (Object.keys(errors).length > 0) {
        logger.warn('Validation error', {
          path: req.path,
          method: req.method,
          errors,
        });

        res.status(400).json({
          success: false,
          message: 'Validation error',
          error: {
            code: 'VALIDATION_ERROR',
            details: 'Request validation failed',
            validationErrors: errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', { error });
      res.status(500).json({
        success: false,
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: 'An error occurred during validation',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Sanitize and clean user input to prevent XSS
 * Removes HTML and script tags from strings
 * @function sanitizeInput
 * @param {any} input - Input to sanitize
 * @returns {any} Sanitized input
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove HTML/script content
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }

  if (typeof input === 'object' && input != null) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Sanitization middleware
 * Sanitizes request body, params, and query
 * @function sanitizationMiddleware
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export function sanitizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeInput(req.params);
    }

    // Sanitize query
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeInput(req.query);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error', { error });
    res.status(500).json({
      success: false,
      message: 'Sanitization failed',
      error: {
        code: 'SANITIZATION_ERROR',
        details: 'An error occurred during input sanitization',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Validate JSON payload size
 * @function validatePayloadSize
 * @param {number} maxSize - Maximum payload size in bytes
 * @returns {Function} Express middleware function
 */
export function validatePayloadSize(maxSize = 10 * 1024 * 1024) {
  // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      logger.warn('Payload size exceeds limit', {
        contentLength,
        maxSize,
        ip: req.ip,
      });

      res.status(413).json({
        success: false,
        message: 'Payload too large',
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          details: `Payload size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * CSRF token validation middleware
 * Validates CSRF tokens for state-changing requests
 * @function validateCsrfToken
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export function validateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!token) {
    logger.warn('CSRF token missing', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      error: {
        code: 'CSRF_TOKEN_MISSING',
        details: 'CSRF token is required for this operation',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // TODO: Implement actual CSRF token validation
  // For now, just check if token exists
  next();
}
