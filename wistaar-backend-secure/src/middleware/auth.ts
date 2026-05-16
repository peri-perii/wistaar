/**
 * @fileoverview Authentication middleware for JWT verification
 * Extracts and validates JWT tokens from request headers
 * @module middleware/auth
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../utils/types.js';
import { logger, logSecurityEvent } from '../utils/logger.js';

/**
 * JWT verification middleware
 * Verifies access token and attaches user info to request
 * @function authMiddleware
 * @param {AuthRequest} req - Express request with auth info
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {void}
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      logSecurityEvent('missing_auth_token', undefined, req.ip);
      res.status(401).json({
        success: false,
        message: 'Missing authentication token',
        error: {
          code: 'MISSING_TOKEN',
          details: 'Authorization header with Bearer token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Attach user info to request
    req.userId = decoded.userId;
    req.email = decoded.email;
    req.role = decoded.role;
    req.iat = decoded.iat;
    req.exp = decoded.exp;
    req.ip = req.ip || req.connection.remoteAddress;

    logger.debug('Token verified', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logSecurityEvent('token_expired', undefined, req.ip);
      res.status(401).json({
        success: false,
        message: 'Token expired',
        error: {
          code: 'TOKEN_EXPIRED',
          details: 'Please refresh your token',
        },
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logSecurityEvent('invalid_token', undefined, req.ip);
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: {
          code: 'INVALID_TOKEN',
          details: 'Token signature verification failed',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error('Auth middleware error', { error });
      res.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: {
          code: 'AUTH_ERROR',
          details: 'An error occurred during authentication',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 * @function extractToken
 * @param {AuthRequest} req - Express request
 * @returns {string|null} Token or null if not found
 */
function extractToken(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Optional authentication middleware
 * Does not fail if token is missing, but verifies if present
 * @function optionalAuthMiddleware
 * @param {AuthRequest} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {void}
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;

      req.userId = decoded.userId;
      req.email = decoded.email;
      req.role = decoded.role;
      req.ip = req.ip || req.connection.remoteAddress;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.debug('Optional auth token invalid (proceeding anonymously)');
    next();
  }
}

/**
 * Refresh token middleware
 * Extracts and validates refresh token (typically from cookies)
 * @function refreshTokenMiddleware
 * @param {AuthRequest} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {void}
 */
export function refreshTokenMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get refresh token from httpOnly cookie or body
    const refreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token missing',
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          details: 'Refresh token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    ) as JwtPayload;

    req.userId = decoded.userId;
    req.email = decoded.email;
    req.role = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logSecurityEvent('refresh_token_expired', undefined, req.ip);
      res.status(401).json({
        success: false,
        message: 'Refresh token expired',
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          details: 'Please login again',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error('Refresh token verification failed', { error });
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          details: 'Refresh token verification failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
