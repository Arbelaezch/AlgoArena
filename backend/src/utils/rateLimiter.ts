import type { Request, Response, NextFunction } from 'express';

import { getRedisClient } from '../config/redis';
import { createExternalServiceError } from './errorHelpers';
import { ERROR_CODES } from '../types/error';
import { AppError } from '../errors/AppError';

export interface RateLimitConfig {
  windowMs: number;                         // Time window in milliseconds
  maxRequests: number;                      // Max requests per window
  keyGenerator?: (req: Request) => string;  // Custom key generation
  skipSuccessfulRequests?: boolean;         // Don't count successful requests
  skipFailedRequests?: boolean;             // Don't count failed requests
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsRemaining: number;
  resetTime: Date;
}

/**
 * Get client identifier for rate limiting
 */
const getClientKey = (req: Request, prefix: string = 'rate_limit'): string => {
  // Try to get IP from various headers (for proxies/load balancers)
  const ip = req.ip || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection as any)?.socket?.remoteAddress ||
             'unknown';
  
  return `${prefix}:${ip}`;
};

/**
 * Create rate limiter middleware
 */
export const createRateLimit = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      const key = config.keyGenerator ? config.keyGenerator(req) : getClientKey(req);
      const windowInSeconds = Math.ceil(config.windowMs / 1000);

      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (currentCount >= config.maxRequests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toISOString(),
          'Retry-After': ttl.toString()
        });

        // Throw proper error instead of manual response
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

      // Set rate limit headers for successful requests
      const remaining = Math.max(0, config.maxRequests - (currentCount + 1));
      const ttl = await redis.ttl(key);
      const resetTime = new Date(Date.now() + (ttl * 1000));

      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString()
      });

      next();

    } catch (error) {
      // If it's already an AppError (rate limit exceeded), just pass it through
      if (error instanceof AppError) {
        next(error);
        return;
      }

      // Handle Redis errors properly but fail open
      const redisError = createExternalServiceError('Redis', 'Rate limiter error', error instanceof Error ? error : undefined);
      console.error('Rate limiter error (failing open):', redisError.message, redisError.details);
      
      // On Redis errors, allow the request through (fail open)
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for different endpoints
 */

// Strict rate limiting for login attempts (prevent brute force)
export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,           // 5 attempts per 15 minutes
  keyGenerator: (req) => getClientKey(req, 'login_limit')
});

// Registration rate limiting (prevent spam)
export const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // 3 registrations per hour
  keyGenerator: (req) => getClientKey(req, 'register_limit')
});

// Token refresh rate limiting
export const refreshTokenRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,          // 10 refreshes per hour
  keyGenerator: (req) => getClientKey(req, 'refresh_limit')
});

// General API rate limiting (more lenient)
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,         // 100 requests per 15 minutes
  keyGenerator: (req) => getClientKey(req, 'api_limit')
});

/**
 * User-specific rate limiting (for authenticated requests)
 */
export const createUserRateLimit = (config: RateLimitConfig) => {
  return createRateLimit({
    ...config,
    keyGenerator: (req) => {
      // Use user ID if authenticated, fallback to IP
      const userId = (req as any).user?.id;
      const prefix = config.keyGenerator ? 'user_limit' : 'rate_limit';
      
      if (userId) {
        return `${prefix}:user:${userId}`;
      }
      return getClientKey(req, prefix);
    }
  });
};

/**
 * Get current rate limit status for a key
 */
export const getRateLimitStatus = async (req: Request, prefix: string = 'rate_limit'): Promise<RateLimitInfo | null> => {
  try {
    const redis = getRedisClient();
    const key = getClientKey(req, prefix);
    
    const current = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    if (!current) {
      return null;
    }

    return {
      totalHits: parseInt(current),
      totalHitsRemaining: Math.max(0, 5 - parseInt(current)), // Default max of 5
      resetTime: new Date(Date.now() + (ttl * 1000))
    };
  } catch (error) {
    const redisError = createExternalServiceError('Redis', 'Failed to get rate limit status', error instanceof Error ? error : undefined);
    console.error('Rate limit status error:', redisError.message, redisError.details);
    return null;
  }
};

/**
 * Reset rate limit for a specific key (admin function)
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