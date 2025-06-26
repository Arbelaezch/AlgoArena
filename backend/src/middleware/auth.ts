import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { AuthenticatedRequest } from '../types/request';
import { isTokenBlacklisted } from '../utils/redisTokens';
import { getUserWithCache } from '../utils/userCache';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Access token is required'
      });
      return;
    }

    // Check if token is blacklisted (optional - for immediate revocation)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        error: 'Token has been revoked'
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from cache first, then database if not cached
    const user = await getUserWithCache(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: 'User not found'
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid or expired access token'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    // If no token provided, continue without authentication
    if (!token) {
      req.user = undefined;
      next();
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      req.user = undefined;
      next();
      return;
    }

    // Try to verify token
    try {
      const decoded = verifyAccessToken(token);

      // Get user from cache first, then database if not cached
      const user = await getUserWithCache(decoded.userId);
      req.user = user || undefined;
    } catch (tokenError) {
      // Token is invalid/expired, but don't fail the request
      req.user = undefined;
    }

    next();

  } catch (error) {
    // On any error, just continue without authentication
    console.error('Optional auth error:', error);
    req.user = undefined;
    next();
  }
};