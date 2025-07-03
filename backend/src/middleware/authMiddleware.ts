import type { Request, Response, NextFunction } from 'express';

import { authService } from '../services/authService.js';
import { createAuthError } from '../utils/errorHelpers.js';
import { ERROR_CODES } from '../types/error.js';

/**
 * Require authentication (JWT or Session)
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.verify(req);
    
    if (!user) {
      throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - continues even if not authenticated
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.verify(req);
    req.user = user || undefined;
    next();
  } catch (error) {
    // On any error, just continue without authentication
    req.user = undefined;
    next();
  }
};

/**
 * Require specific role
 */
export const requireRole = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.verify(req);
      
      if (!user) {
        throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
      }

      if (user.role !== role) {
        throw createAuthError(
          ERROR_CODES.FORBIDDEN, 
          `Access denied. Required role: ${role}`
        );
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific permission (if session has permissions)
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.verify(req);
      
      if (!user) {
        throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
      }

      // Check permission in session data
      if (req.session.user?.permissions && !req.session.user.permissions.includes(permission)) {
        throw createAuthError(
          ERROR_CODES.FORBIDDEN, 
          `Access denied. Required permission: ${permission}`
        );
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require ownership or admin role
 */
export const requireOwnershipOrAdmin = (getUserIdFromParams: (req: Request) => number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.verify(req);
      
      if (!user) {
        throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
      }

      const resourceUserId = getUserIdFromParams(req);
      const isOwner = user.id === resourceUserId;
      const isAdmin = ['admin', 'superadmin'].includes(user.role);

      if (!isOwner && !isAdmin) {
        throw createAuthError(
          ERROR_CODES.FORBIDDEN,
          'You can only access your own resources'
        );
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};