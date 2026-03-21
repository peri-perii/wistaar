/**
 * @fileoverview Authentication service for user signup, login, and token management
 * Handles JWT generation, bcrypt hashing, and account security
 * @module modules/auth/service
 */

import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { logger, logAuthEvent } from '../../utils/logger.js';
import { cryptoUtil } from '../../utils/crypto.js';
import { JwtPayload, UserRole } from '../../utils/types.js';
import { prisma } from '../../config/database.js';

/**
 * Auth service for managing user authentication
 * @class AuthService
 */
export class AuthService {
  private readonly accessTokenExpiry = 15 * 60; // 15 minutes in seconds
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Register a new user
   * @async
   * @method register
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password (plain text)
   * @param {string} userData.name - User name
   * @param {string} [userData.role] - User role (default: USER)
   * @returns {Promise<Object>} User data with tokens
   * @throws {Error} If user already exists or registration fails
   */
  public async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<any> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        logAuthEvent('signup', null, userData.email, 'failure', 'user_exists');
        throw new Error('User with this email already exists');
      }

      // Hash password with bcrypt (12 salt rounds)
      const passwordHash = await cryptoUtil.hashPassword(
        userData.password,
        12
      );

      // Generate email verification token
      const emailVerificationToken = uuid();
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          id: uuid(),
          email: userData.email,
          passwordHash,
          name: userData.name,
          role: userData.role || 'USER',
          emailVerificationToken,
          emailVerificationExpiry,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      logAuthEvent('signup', user.id, userData.email, 'success');

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokenPair(
        user.id,
        userData.email,
        user.role as UserRole
      );

      logger.info('User registered successfully', {
        userId: user.id,
        email: userData.email,
      });

      return {
        user,
        accessToken,
        refreshToken,
        emailVerificationToken, // Send to email in production
      };
    } catch (error) {
      logger.error('Registration failed', {
        email: userData.email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Login user with email and password
   * @async
   * @method login
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} [ip] - Client IP for audit logging
   * @returns {Promise<Object>} User data with tokens
   * @throws {Error} If user not found, password invalid, or account locked
   */
  public async login(
    email: string,
    password: string,
    ip?: string
  ): Promise<any> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          accountLocked: true,
          lockUntil: true,
          failedAttempts: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        logAuthEvent('login', null, email, 'failure', 'user_not_found', ip);
        throw new Error('Invalid email or password');
      }

      // Check if account is locked
      if (user.accountLocked && user.lockUntil) {
        if (new Date() < user.lockUntil) {
          logAuthEvent('login', user.id, email, 'failure', 'account_locked', ip);
          throw new Error(
            `Account is locked. Try again after ${user.lockUntil.toISOString()}`
          );
        } else {
          // Unlock account
          await prisma.user.update({
            where: { id: user.id },
            data: { accountLocked: false, lockUntil: null, failedAttempts: 0 },
          });
        }
      }

      // Check email verification
      if (!user.isEmailVerified) {
        logger.warn('Login attempt with unverified email', {
          userId: user.id,
          email,
        });
        // Allow login but notify about verification
      }

      // Verify password
      const passwordMatch = await cryptoUtil.comparePassword(
        password,
        user.passwordHash
      );

      if (!passwordMatch) {
        // Increment failed attempts
        const newFailedAttempts = (user.failedAttempts || 0) + 1;
        const maxAttempts = parseInt(
          process.env.ACCOUNT_LOCKOUT_ATTEMPTS || '5',
          10
        );

        if (newFailedAttempts >= maxAttempts) {
          // Lock account
          const lockDurationMs = parseInt(
            process.env.ACCOUNT_LOCKOUT_DURATION_MS || '1800000',
            10
          ); // 30 minutes default
          const lockUntil = new Date(Date.now() + lockDurationMs);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              accountLocked: true,
              lockUntil,
              failedAttempts: newFailedAttempts,
            },
          });

          logAuthEvent('login', user.id, email, 'failure', 'account_locked_max_attempts', ip);
          throw new Error('Account locked due to too many failed attempts');
        } else {
          // Just increment counter
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: newFailedAttempts },
          });

          logAuthEvent('login', user.id, email, 'failure', 'invalid_password', ip);
          throw new Error('Invalid email or password');
        }
      }

      // Reset failed attempts and update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: 0,
          lastLogin: new Date(),
        },
      });

      logAuthEvent('login', user.id, email, 'success', undefined, ip);

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokenPair(
        user.id,
        email,
        user.role as UserRole
      );

      logger.info('User login successful', { userId: user.id, email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login failed', {
        email,
        error: (error as Error).message,
        ip,
      });
      throw error;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   * @async
   * @private
   * @method generateTokenPair
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {UserRole} role - User role
   * @returns {Promise<Object>} Access and refresh tokens
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Create access token payload
    const accessTokenPayload: JwtPayload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiry,
    };

    // Create refresh token payload
    const refreshTokenPayload: JwtPayload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.refreshTokenExpiry,
    };

    // Sign tokens
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );

    // Store refresh token in database (optional, for revocation)
    try {
      await prisma.refreshToken.create({
        data: {
          token: this.hashToken(refreshToken),
          userId,
          expiresAt: new Date(Date.now() + this.refreshTokenExpiry * 1000),
        },
      });
    } catch (error) {
      logger.warn('Failed to store refresh token', { error });
      // Non-critical, continue anyway
    }

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   * @async
   * @method refreshAccessToken
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} New access token
   * @throws {Error} If refresh token is invalid or expired
   */
  public async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      ) as JwtPayload;

      // Check if token is revoked in database
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          userId: decoded.userId,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
      });

      if (!tokenRecord) {
        throw new Error('Refresh token is revoked or expired');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiry,
        },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      logger.info('Access token refreshed', { userId: decoded.userId });

      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error('Token refresh failed', { error: (error as Error).message });
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Revoke refresh token (logout)
   * @async
   * @method logout
   * @param {string} userId - User ID
   * @param {string} [refreshToken] - Token to specifically revoke
   * @returns {Promise<void>}
   */
  public async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Revoke specific refresh token
        const hashedToken = this.hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { token: hashedToken },
          data: { revokedAt: new Date() },
        });
      } else {
        // Revoke all user refresh tokens
        await prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      logAuthEvent('logout', userId, '', 'success');
      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Logout failed', { userId, error });
      throw error;
    }
  }

  /**
   * Simple hash for token storage (not for passwords)
   * @private
   * @method hashToken
   * @param {string} token - Token to hash
   * @returns {string} Hash of token
   */
  private hashToken(token: string): string {
    return cryptoUtil.createSignature(token);
  }
}

// Export singleton instance
export const authService = new AuthService();
