/**
 * @fileoverview Prisma database client configuration
 * Initializes and manages the database connection
 * @module config/database
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Prisma client instance for database operations
 * Uses native connection pooling
 * @constant prisma
 */
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'query' },
  ],
  errorFormat: 'pretty',
});

/**
 * Setup event listeners for Prisma logging
 */
prisma.$on('query', (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database query', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  }
});

prisma.$on('error', (e: any) => {
  logger.error('Prisma error', {
    code: e.code,
    message: e.message,
  });
});

prisma.$on('warn', (e: any) => {
  logger.warn('Prisma warning', {
    message: e.message,
  });
});

/**
 * Connect to database on startup
 * @async
 * @function connectDatabase
 * @returns {Promise<void>}
 * @throws {Error} If database connection fails
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully', {
      provider: 'mysql',
      connectionPoolSize: 'default',
    });
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

/**
 * Disconnect from database on shutdown
 * @async
 * @function disconnectDatabase
 * @returns {Promise<void>}
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Database disconnect failed', { error });
  }
}

/**
 * Graceful shutdown handler
 * @function setupGracefulShutdown
 * @description Call this when starting server to handle process signals
 */
export function setupGracefulShutdown(): void {
  const signals = ['SIGINT', 'SIGTERM'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, gracefully shutting down...`);
      await disconnectDatabase();
      process.exit(0);
    });
  });
}

export default prisma;
