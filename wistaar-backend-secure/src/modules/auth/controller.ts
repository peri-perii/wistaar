/**
 * @fileoverview Authentication controller for handling auth requests
 * Endpoints: signup, login, logout, refresh, email verification, password reset
 * @module modules/auth/controller
 */

import { Response } from 'express';
import { authService } from './service.js';
import { authLimiter, emailVerificationLimiter, passwordResetLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validation.js';
import { asyncHandler, AppError } from '../../middleware/error.js';
import { AuthRequest } from '../../utils/types.js';
import { logger } from '../../utils/logger.js';
import {
  signupSchema,
  loginSchema,
  emailVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from '../../schemas/validation.js';

/**
 * Auth controller class with all authentication endpoints
 * @class AuthController
 */
export class AuthController {
  /**
   * User signup endpoint
   * POST /api/auth/signup
   * @async
   * @route POST /signup
   * @param {Request} req - Express request with signup data
   * @param {Response} res - Express response
   * @throws {AppError} If signup fails
   */
  static signup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, name, role } = req.body;

    try {
      const result = await authService.register({
        email,
        password,
        name,
        role,
      });

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          emailVerificationToken: result.emailVerificationToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 400, 'SIGNUP_ERROR');
      }
      throw error;
    }
  });

  /**
   * User login endpoint
   * POST /api/auth/login
   * @async
   * @route POST /login
   * @param {AuthRequest} req - Express request with login credentials
   * @param {Response} res - Express response
   * @throws {AppError} If login fails or account locked
   */
  static login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const result = await authService.login(email, password, clientIp);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Account locked') ||
          error.message.includes('Invalid email or password') ||
          error.message.includes('not found')
        ) {
          throw new AppError(error.message, 401, 'LOGIN_ERROR');
        }
      }
      throw error;
    }
  });

  /**
   * Refresh access token using refresh token
   * POST /api/auth/refresh
   * @async
   * @route POST /refresh
   * @param {AuthRequest} req - Express request with refresh token
   * @param {Response} res - Express response
   */
  static refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        throw new AppError('Refresh token missing', 401, 'MISSING_REFRESH_TOKEN');
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 401, 'TOKEN_REFRESH_ERROR');
      }
      throw error;
    }
  });

  /**
   * Logout user and revoke refresh tokens
   * POST /api/auth/logout
   * @async
   * @route POST /logout
   * @param {AuthRequest} req - Authenticated request
   * @param {Response} res - Express response
   */
  static logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const refreshToken = req.cookies?.refreshToken;
      await authService.logout(req.userId, refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new AppError(error.message, 500, 'LOGOUT_ERROR');
      }
      throw error;
    }
  });

  /**
   * Verify email address with verification token
   * POST /api/auth/verify-email
   * @async
   * @route POST /verify-email
   * @param {AuthRequest} req - Request with verification token
   * @param {Response} res - Express response
   * @todo Implement email verification logic
   */
  static verifyEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;

    // TODO: Implement email verification with database update
    logger.info('Email verification requested', { token_length: token?.length });

    res.status(200).json({
      success: true,
      message: 'Email verification logic - TODO',
      data: null,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   * @async
   * @route POST /forgot-password
   * @param {AuthRequest} req - Request with email
   * @param {Response} res - Express response
   * @todo Implement password reset email
   */
  static forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    // TODO: Generate reset token, save to DB, send email
    logger.info('Password reset requested', { email });

    res.status(200).json({
      success: true,
      message: 'Password reset logic - TODO',
      data: null,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   * @async
   * @route POST /reset-password
   * @param {AuthRequest} req - Request with reset token and new password
   * @param {Response} res - Express response
   * @todo Implement password reset completion
   */
  static resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token, password } = req.body;

    // TODO: Verify token, hash new password, update DB
    logger.info('Password reset completion requested');

    res.status(200).json({
      success: true,
      message: 'Password reset logic - TODO',
      data: null,
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Create auth routes with all endpoints
 * @function createAuthRoutes
 * @returns {Express.Router} Configured router
 * @example
 * const authRoutes = createAuthRoutes();
 * app.use('/api/auth', authRoutes);
 */
export function createAuthRoutes() {
  const { Router } = require('express');
  const router = Router();

  // Public routes with rate limiting
  router.post(
    '/signup',
    authLimiter,
    validate(signupSchema),
    AuthController.signup
  );

  router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    AuthController.login
  );

  router.post(
    '/verify-email',
    emailVerificationLimiter,
    validate(emailVerificationSchema),
    AuthController.verifyEmail
  );

  router.post(
    '/forgot-password',
    passwordResetLimiter,
    validate(passwordResetRequestSchema),
    AuthController.forgotPassword
  );

  router.post(
    '/reset-password',
    passwordResetLimiter,
    validate(passwordResetSchema),
    AuthController.resetPassword
  );

  // Protected routes
  const { authMiddleware } = require('../../middleware/auth');

  router.post(
    '/refresh',
    validate({ body: z.object({}).optional() }),
    AuthController.refreshToken
  );

  router.post(
    '/logout',
    authMiddleware,
    AuthController.logout
  );

  return router;
}

export default AuthController;
