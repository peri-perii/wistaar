/**
 * @fileoverview Express application setup and configuration
 * Initializes middleware, routes, and security features
 * @module app
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import { logger, requestLogger } from './middleware/error.js';
import {
  authMiddleware,
  optionalAuthMiddleware,
  refreshTokenMiddleware,
} from './middleware/auth.js
import {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  paymentLimiter,
} from './middleware/rateLimit.js';
import {
  sanitizationMiddleware,
  validatePayloadSize,
} from './middleware/validation.js';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from './middleware/error.js';

/**
 * Create and configure Express application
 * @function createApp
 * @returns {Express} Configured Express app
 */
export function createApp(): Express {
  const app = express();

  // ============ Security Middleware ============

  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // HTTPS redirect
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // ============ CORS Configuration ============
  app.use(
    cors({
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-API-Key',
      ],
      maxAge: 800,
    })
  );

  // ============ Body Parsing & Validation ============
  app.use(validatePayloadSize(10 * 1024 * 1024)); // 10MB limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // ============ Logging & Sanitization ============
  app.use(requestLogger);
  app.use(sanitizationMiddleware);

  // ============ Rate Limiting ============
  app.use(generalLimiter);

  // ============ Health Check ============
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ============ Public Routes ============
  // TODO: Mount public routes (auth, public books, etc.)
  // app.use('/api/auth', authRoutes);
  // app.use('/api/books', publicBookRoutes);

  // ============ Protected Routes ============
  // TODO: Mount protected routes
  // app.use('/api/user', authMiddleware, userRoutes);
  // app.use('/api/admin', authMiddleware, adminOnly, adminRoutes);
  // app.use('/api/payments', authMiddleware, paymentLimiter, paymentRoutes);

  // ============ Error Handling ============
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 * @function startServer
 * @async
 * @returns {Promise<void>}
 */
export async function startServer(): Promise<void> {
  try {
    const port = process.env.PORT || 5000;
    const app = createApp();

    app.listen(port, () => {
      logger.info(`Server started on port ${port}`, {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
