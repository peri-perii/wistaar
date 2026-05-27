/**
 * @fileoverview Rate limiting middleware to prevent abuse
 * Implements multiple rate limit strategies for different endpoints
 * @module middleware/rateLimit
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger, logSecurityEvent } from '../utils/logger.js';

/**
 * General rate limiter: 100 requests per 15 minutes
 * @constant generalLimiter
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
  skip: (req) => {
    // Don't rate limit health check
    return req.path === '/health';
  },
  handler: (req, res) => {
    logSecurityEvent('rate_limit_exceeded_general', undefined, req.ip);
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        details: 'You have exceeded the rate limit. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Strict rate limiter for authentication: 5 requests per 15 minutes
 * Prevents brute force attacks on login/signup
 * @constant authLimiter
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email if available
    const email = req.body?.email || req.body?.username || '';
    return `${req.ip}-${email}`;
  },
  skip: (req) => {
    // Skip if no email provided
    return !req.body?.email && !req.body?.username;
  },
  handler: (req, res) => {
    const email = req.body?.email || req.body?.username;
    logSecurityEvent(
      'rate_limit_exceeded_auth',
      undefined,
      req.ip,
      { email, action: req.path }
    );

    logger.warn('Auth rate limit exceeded', {
      email,
      ip: req.ip,
      action: req.path,
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        details: 'Too many failed attempts. Please try again in 15 minutes.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * File upload rate limiter: 10 uploads per hour
 * @constant uploadLimiter
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return (req as any).userId || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logSecurityEvent(
      'rate_limit_exceeded_upload',
      (req as any).userId,
      req.ip
    );

    res.status(429).json({
      success: false,
      message: 'Upload limit exceeded',
      error: {
        code: 'UPLOAD_LIMIT_EXCEEDED',
        details: 'You have exceeded the upload limit. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * API key rate limiter: 1000 requests per hour for API integrations
 * @constant apiKeyLimiter
 */
export const apiKeyLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Get API key from header or query
    return req.headers['x-api-key'] as string || req.query.api_key as string || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logSecurityEvent(
      'rate_limit_exceeded_api',
      undefined,
      req.ip,
      { apiKey: req.headers['x-api-key'] }
    );

    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded',
      error: {
        code: 'API_RATE_LIMIT_EXCEEDED',
        details: 'API rate limit exceeded. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Payment processing rate limiter: 5 attempts per hour
 * @constant paymentLimiter
 */
export const paymentLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 payment attempts per hour
  message: 'Too many payment attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).userId || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logSecurityEvent(
      'rate_limit_exceeded_payment',
      (req as any).userId,
      req.ip
    );

    logger.warn('Payment rate limit exceeded', {
      userId: (req as any).userId,
      ip: req.ip,
    });

    res.status(429).json({
      success: false,
      message: 'Too many payment attempts',
      error: {
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        details: 'Too many payment attempts. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Email verification rate limiter: 3 attempts per 24 hours
 * @constant emailVerificationLimiter
 */
export const emailVerificationLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 attempts per day
  message: 'Too many verification attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.email || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logSecurityEvent(
      'rate_limit_exceeded_email_verification',
      undefined,
      req.ip,
      { email: req.body?.email }
    );

    res.status(429).json({
      success: false,
      message: 'Too many verification attempts',
      error: {
        code: 'EMAIL_VERIFICATION_RATE_LIMIT',
        details: 'Too many verification attempts. Please try again tomorrow.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Password reset rate limiter: 3 attempts per 24 hours
 * @constant passwordResetLimiter
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 attempts per day
  message: 'Too many password reset attempts',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.email || req.ip || 'unknown';
  },
  handler: (req, res) => {
    logSecurityEvent(
      'rate_limit_exceeded_password_reset',
      undefined,
      req.ip,
      { email: req.body?.email }
    );

    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts',
      error: {
        code: 'PASSWORD_RESET_RATE_LIMIT',
        details: 'Too many reset attempts. Please try again tomorrow.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Create custom rate limiter with flexible configuration
 * @function createCustomLimiter
 * @param {Object} config - Configuration object
 * @param {number} config.windowMs - Time window in milliseconds
 * @param {number} config.max - Max requests per window
 * @param {string} config.name - Limiter name for logging
 * @returns {RateLimitRequestHandler} Express rate limit middleware
 * @example
 * const searchLimiter = createCustomLimiter({
 *   windowMs: 60000,
 *   max: 30,
 *   name: 'search'
 * });
 */
export function createCustomLimiter(config: {
  windowMs: number;
  max: number;
  name: string;
  keyGenerator?: (req: any) => string;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: config.keyGenerator || ((req) => req.ip || 'unknown'),
    handler: (req, res) => {
      logSecurityEvent(
        `rate_limit_exceeded_${config.name}`,
        undefined,
        req.ip
      );

      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          details: `Rate limit for ${config.name} exceeded. Please try again later.`,
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
}
