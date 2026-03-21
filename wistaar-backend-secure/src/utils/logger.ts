/**
 * @fileoverview Winston logger configuration for structured logging
 * Handles application logging without exposing sensitive data
 * @module utils/logger
 */

import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger levels with numeric severity
 * @constant LOG_LEVELS
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Color mapping for console output in development
 * @constant COLORS
 */
const COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Set colors for winston
winston.addColors(COLORS);

/**
 * Format for log output
 * @function format
 * @description Creates formatted log output with timestamp, level, and message
 */
const formatLog = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: isDevelopment }), // Include stack trace in development
  winston.format.json(),
  // Remove sensitive data from logs
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Never log passwords, tokens, or keys
    const sanitized = sanitizeSensitiveData(meta);

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(isDevelopment && sanitized && Object.keys(sanitized).length > 0 ? sanitized : {}),
    });
  })
);

/**
 * Remove sensitive data from log objects
 * @function sanitizeSensitiveData
 * @param {Record<string, any>} obj - Object to sanitize
 * @returns {Record<string, any>} Sanitized object
 */
function sanitizeSensitiveData(obj: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'key',
    'creditCard',
    'ssn',
    'pin',
    'encryptionKey',
    'encryptedData',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create Winston logger instance
 * @constant logger
 * @type {winston.Logger}
 * @description Main logger for application-wide logging
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels: LOG_LEVELS,
  format: formatLog,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        formatLog
      ),
    }),

    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // Auth events log file
    new winston.transports.File({
      filename: 'logs/auth.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.json()
      ),
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

/**
 * Log authentication event
 * @function logAuthEvent
 * @param {string} action - Auth action (login, signup, logout, etc.)
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} status - Event status (success/failure)
 * @param {string} [reason] - Failure reason if applicable
 * @param {string} [ip] - Client IP address
 */
export function logAuthEvent(
  action: string,
  userId: string | null,
  email: string,
  status: 'success' | 'failure',
  reason?: string,
  ip?: string
): void {
  logger.info('AUTH_EVENT', {
    action,
    userId,
    email,
    status,
    reason,
    ip,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log admin action for audit trail
 * @function logAdminAction
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action performed
 * @param {string} targetType - Type of resource affected (user, book, etc.)
 * @param {string} targetId - ID of affected resource
 * @param {Record<string, any>} details - Additional action details
 * @param {string} [ip] - Admin IP address
 */
export function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, any>,
  ip?: string
): void {
  logger.info('ADMIN_ACTION', {
    adminId,
    action,
    targetType,
    targetId,
    details: sanitizeSensitiveData(details),
    ip,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log payment attempt
 * @function logPaymentEvent
 * @param {string} userId - User ID
 * @param {string} action - Payment action (initiate, success, failure, etc.)
 * @param {string} status - Event status
 * @param {number} amount - Payment amount
 * @param {any} transactionId - Transaction ID
 * @param {Record<string, any>} details - Additional details
 */
export function logPaymentEvent(
  userId: string,
  action: string,
  status: 'success' | 'failure' | 'pending',
  amount: number,
  transactionId: any,
  details?: Record<string, any>
): void {
  logger.info('PAYMENT_EVENT', {
    userId,
    action,
    status,
    amount,
    transactionId,
    details: details ? sanitizeSensitiveData(details) : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log security event
 * @function logSecurityEvent
 * @param {string} eventType - Type of security event
 * @param {string} [userId] - User ID if applicable
 * @param {string} [ip] - Client IP address
 * @param {Record<string, any>} [details] - Event details
 */
export function logSecurityEvent(
  eventType: string,
  userId?: string,
  ip?: string,
  details?: Record<string, any>
): void {
  logger.warn('SECURITY_EVENT', {
    eventType,
    userId,
    ip,
    details,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
