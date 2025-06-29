import { Request, Response, NextFunction } from 'express';
import { updateSessionActivity } from '../services/sessionService';

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
    return;
  }

  // Update activity timestamp
  updateSessionActivity(req);
  next();
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
      return;
    }

    if (req.session.user.role !== role) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires ${role} role`,
      });
      return;
    }

    updateSessionActivity(req);
    next();
  };
};

/**
 * Middleware to check if user has any of the specified roles
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
      return;
    }

    if (!roles.includes(req.session.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires one of the following roles: ${roles.join(', ')}`,
      });
      return;
    }

    updateSessionActivity(req);
    next();
  };
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
      return;
    }

    if (!req.session.user.permissions || !req.session.user.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires '${permission}' permission`,
      });
      return;
    }

    updateSessionActivity(req);
    next();
  };
};

/**
 * Middleware to check if user is the resource owner or has admin role
 */
export const requireOwnershipOrAdmin = (getUserIdFromParams: (req: Request) => number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
      return;
    }

    const resourceUserId = getUserIdFromParams(req);
    const isOwner = req.session.user.userId === resourceUserId;
    const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
      return;
    }

    updateSessionActivity(req);
    next();
  };
};

/**
 * Optional auth middleware - continues even if not authenticated
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session.user) {
    updateSessionActivity(req);
  }
  next();
};

/**
 * Middleware to prevent authenticated users from accessing auth pages
 */
export const requireGuest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session.user) {
    res.status(400).json({
      error: 'Already authenticated',
      message: 'You are already logged in',
    });
    return;
  }
  next();
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = () => {
  const attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const userAttempts = attempts.get(key);

    // Clean up old attempts
    if (userAttempts && now - userAttempts.lastAttempt > windowMs) {
      attempts.delete(key);
    }

    const currentAttempts = attempts.get(key);
    
    if (currentAttempts && currentAttempts.count >= maxAttempts) {
      res.status(429).json({
        error: 'Too many attempts',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((windowMs - (now - currentAttempts.lastAttempt)) / 1000),
      });
      return;
    }

    // Record this attempt
    attempts.set(key, {
      count: (currentAttempts?.count || 0) + 1,
      lastAttempt: now,
    });

    next();
  };
};