import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis.js';
import { createExternalServiceError } from './errorHelpers.js';
import { ERROR_CODES } from '../types/error.js';
import { AppError } from '../errors/AppError.js';

export interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyPrefix?: string;   // Custom key prefix
  useUserKey?: boolean; // For authenticated requests
}

/**
 * Get client identifier for rate limiting
 */
const getClientKey = (req: Request, prefix: string = 'rate_limit'): string => {
  // Try to get IP from various headers (for proxies/load balancers)
  const ip = req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             'unknown';
  
  return `${prefix}:${ip}`;
};

/**
 * Get user-specific key if authenticated, fallback to IP
 */
const getUserKey = (req: Request, prefix: string): string => {
  const userId = (req as any).user?.id;
  if (userId) {
    return `${prefix}:user:${userId}`;
  }
  return getClientKey(req, prefix);
};

/**
 * Set rate limit headers
 */
const setRateLimitHeaders = (res: Response, limit: number, remaining: number, resetTime: Date, ttl?: number): void => {
  res.set({
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toISOString(),
    ...(ttl && { 'Retry-After': ttl.toString() })
  });
};

/**
 * Create rate limiter middleware
 */
export const createRateLimit = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, keyPrefix = 'rate_limit', useUserKey = false } = config;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      const key = useUserKey ? getUserKey(req, keyPrefix) : getClientKey(req, keyPrefix);
      const windowInSeconds = Math.ceil(windowMs / 1000);

      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (currentCount >= maxRequests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        setRateLimitHeaders(res, maxRequests, 0, resetTime, ttl);

        throw new AppError(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Try again in ${ttl} seconds.`,
          429,
          { retryAfter: ttl, resetTime: resetTime.toISOString() }
        );
      }

      // Increment counter
      if (currentCount === 0) {
        // First request in window - set with expiration
        await redis.setEx(key, windowInSeconds, '1');
      } else {
        // Increment existing counter
        await redis.incr(key);
      }

      // Set success headers
      const remaining = Math.max(0, maxRequests - (currentCount + 1));
      const ttl = await redis.ttl(key);
      const resetTime = new Date(Date.now() + (ttl * 1000));

      setRateLimitHeaders(res, maxRequests, remaining, resetTime);

      next();

    } catch (error) {
      // If it's already an AppError (rate limit exceeded), just pass it through
      if (error instanceof AppError) {
        next(error);
        return;
      }

      // Fail open on Redis errors
      const redisError = createExternalServiceError('Redis', 'Rate limiter error', error instanceof Error ? error : undefined);
      console.error('Rate limiter error (failing open):', redisError.message, redisError.details);
      
      // On Redis errors, allow the request through (fail open)
      next();
    }
  };
};

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints (strict)
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth_limit' },
  
  // Token refresh (moderate)
  refresh: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'refresh_limit' },
  
  // General API (lenient)
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: 'api_limit' },
  
  // User-specific (for authenticated requests)
  user: { windowMs: 15 * 60 * 1000, maxRequests: 200, keyPrefix: 'user_limit', useUserKey: true }
} as const;

/**
 * Pre-configured rate limiters
 */
export const authRateLimit = createRateLimit(RATE_LIMITS.auth);
export const refreshTokenRateLimit = createRateLimit(RATE_LIMITS.refresh);
export const apiRateLimit = createRateLimit(RATE_LIMITS.api);
export const userRateLimit = createRateLimit(RATE_LIMITS.user);

/**
 * Admin function to reset rate limit for a specific request
 */
export const resetRateLimit = async (req: Request, prefix: string = 'rate_limit'): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const key = getClientKey(req, prefix);
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to reset rate limit', error instanceof Error ? error : undefined);
  }
};