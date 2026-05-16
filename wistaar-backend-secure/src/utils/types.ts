/**
 * @fileoverview Common TypeScript types and interfaces used throughout the application
 * @module utils/types
 */

import { Request } from 'express';

/**
 * User roles in the system
 */
export type UserRole = 'user' | 'author' | 'admin' | 'super_admin';

/**
 * Book submission status
 */
export type BookStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Order status
 */
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Extended Express Request with user info
 */
export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
  ip?: string;
}

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details: string;
  };
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Book metadata
 */
export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  price: number;
  status: BookStatus;
  coverImage?: string;
  manuscriptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * File upload metadata
 */
export interface FileUploadMetadata {
  filename: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
  s3Url?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: number;
  userId?: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details: string;
    stack?: string;
  };
  timestamp: string;
}

/**
 * Payment gateway response
 */
export interface PaymentGatewayResponse {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  timestamp: Date;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

/**
 * Email configuration
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Email template params
 */
export interface EmailParams {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, any>;
}
