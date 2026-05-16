/**
 * @fileoverview Role-Based Access Control (RBAC) middleware
 * Restricts endpoints based on user roles
 * @module middleware/rbac
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../utils/types.js';
import { logger, logSecurityEvent } from '../utils/logger.js';

/**
 * Role hierarchy for permission checking
 * Higher hierarchy includes lower level permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  author: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Create RBAC middleware for specific roles
 * @function requireRole
 * @param {...UserRole[]} allowedRoles - Roles allowed to access endpoint
 * @returns {Function} Express middleware function
 * @example
 * router.get('/admin/dashboard', requireRole('admin', 'super_admin'), controller);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return function (req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'NOT_AUTHENTICATED',
          details: 'Please login first',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userRole = req.role as UserRole;

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      logSecurityEvent(
        'unauthorized_access_attempt',
        req.userId,
        req.ip,
        {
          requiredRoles: allowedRoles,
          userRole,
          path: req.path,
        }
      );

      logger.warn('Role-based access denied', {
        userId: req.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'FORBIDDEN',
          details: `This action requires one of: ${allowedRoles.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Require minimum role level
 * Allows users with role level >= minLevel
 * @function requireMinimumRole
 * @param {UserRole} minimumRole - Minimum required role
 * @returns {Function} Express middleware function
 * @example
 * router.get('/payments', requireMinimumRole('author'), controller);
 */
export function requireMinimumRole(minimumRole: UserRole) {
  return function (req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'NOT_AUTHENTICATED',
          details: 'Please login first',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userRole = req.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole];
    const minimumLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < minimumLevel) {
      logSecurityEvent(
        'insufficient_role_level',
        req.userId,
        req.ip,
        {
          minimumRole,
          userRole,
        }
      );

      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'FORBIDDEN',
          details: `This action requires at least ${minimumRole} role`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Allow super admins only
 * @function superAdminOnly
 * @returns {Function} Express middleware function
 */
export function superAdminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.userId || req.role !== 'super_admin') {
    logSecurityEvent(
      'super_admin_required',
      req.userId,
      req.ip,
      { userRole: req.role }
    );

    res.status(403).json({
      success: false,
      message: 'Super admin access required',
      error: {
        code: 'SUPER_ADMIN_REQUIRED',
        details: 'This action is restricted to super administrators',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Allow admins and super admins
 * @function adminOnly
 * @returns {Function} Express middleware function
 */
export function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.userId || (req.role !== 'admin' && req.role !== 'super_admin')) {
    logSecurityEvent(
      'admin_access_required',
      req.userId,
      req.ip,
      { userRole: req.role }
    );

    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: {
        code: 'ADMIN_REQUIRED',
        details: 'This action requires admin or higher privileges',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Allow authors and above
 * @function authorOnly
 * @returns {Function} Express middleware function
 */
export function authorOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (
    !req.userId ||
    (req.role !== 'author' &&
      req.role !== 'admin' &&
      req.role !== 'super_admin')
  ) {
    res.status(403).json({
      success: false,
      message: 'Author access required',
      error: {
        code: 'AUTHOR_REQUIRED',
        details: 'This action requires author or higher privileges',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

/**
 * Resource ownership checking middleware factory
 * Verifies that user owns or has permission to access resource
 * @function checkResourceOwnership
 * @param {Function} getResourceOwnerId - Async function to get resource owner ID
 * @returns {Function} Express middleware function
 * @example
 * const getOwnerId = async (req) => {
 *   const book = await db.book.findUnique({ where: { id: req.params.id } });
 *   return book?.authorId;
 * };
 * router.put('/books/:id', checkResourceOwnership(getOwnerId), controller);
 */
export function checkResourceOwnership(
  getResourceOwnerId: (req: AuthRequest) => Promise<string | null>
) {
  return async function (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Admins bypass ownership check
      if (req.role === 'admin' || req.role === 'super_admin') {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);

      if (!resourceOwnerId) {
        res.status(404).json({
          success: false,
          message: 'Resource not found',
          error: {
            code: 'NOT_FOUND',
            details: 'The requested resource does not exist',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (resourceOwnerId !== req.userId) {
        logSecurityEvent(
          'resource_ownership_violation',
          req.userId,
          req.ip,
          {
            resourceOwnerId,
            requestedBy: req.userId,
            resource: req.path,
          }
        );

        res.status(403).json({
          success: false,
          message: 'Access denied',
          error: {
            code: 'FORBIDDEN',
            details: 'You do not have permission to access this resource',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed', { error });
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: {
          code: 'AUTH_CHECK_ERROR',
          details: 'An error occurred during authorization',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}
