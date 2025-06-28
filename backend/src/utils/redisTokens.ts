import { getRedisClient } from '../config/redis';
import { createExternalServiceError } from './errorHelpers';

// Prefixes for different token types
const BLACKLIST_PREFIX = 'blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:';

/**
 * Blacklist a token (access or refresh)
 */
export const blacklistToken = async (token: string, expiryInSeconds: number = 7 * 24 * 60 * 60): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = `${BLACKLIST_PREFIX}${token}`;
    
    // Store with expiration (7 days for refresh tokens, 15 minutes for access tokens)
    await redis.setEx(key, expiryInSeconds, '1');
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to blacklist token', error instanceof Error ? error : undefined);
  }
};

/**
 * Check if a token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const key = `${BLACKLIST_PREFIX}${token}`;
    
    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    // In case of Redis error, err on the side of caution but log properly
    const redisError = createExternalServiceError('Redis', 'Failed to check token blacklist', error instanceof Error ? error : undefined);
    console.error('Token blacklist check error (failing safe):', redisError.message, redisError.details);
    return false;
  }
};

/**
 * Store refresh token with user association (optional - for tracking active sessions)
 */
export const storeRefreshToken = async (userId: number, token: string, expiryInSeconds: number = 7 * 24 * 60 * 60): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${token}`;
    
    await redis.setEx(key, expiryInSeconds, JSON.stringify({ userId, createdAt: Date.now() }));
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to store refresh token', error instanceof Error ? error : undefined);
  }
};

/**
 * Remove refresh token from storage
 */
export const removeRefreshToken = async (userId: number, token: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${token}`;
    
    await redis.del(key);
  } catch (error) {
    // Don't throw - this is cleanup, continue anyway but log properly
    const redisError = createExternalServiceError('Redis', 'Failed to remove refresh token', error instanceof Error ? error : undefined);
    console.error('Token removal error (non-fatal):', redisError.message, redisError.details);
  }
};

/**
 * Get all active refresh tokens for a user (for logout all devices)
 */
export const getUserRefreshTokens = async (userId: number): Promise<string[]> => {
  try {
    const redis = getRedisClient();
    const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
    
    const keys = await redis.keys(pattern);
    return keys.map(key => key.replace(`${REFRESH_TOKEN_PREFIX}${userId}:`, ''));
  } catch (error) {
    const redisError = createExternalServiceError('Redis', 'Failed to get user refresh tokens', error instanceof Error ? error : undefined);
    console.error('Get refresh tokens error:', redisError.message, redisError.details);
    return [];
  }
};

/**
 * Revoke all refresh tokens for a user (useful for "logout all devices")
 */
export const revokeAllUserTokens = async (userId: number): Promise<void> => {
  try {
    const redis = getRedisClient();
    const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
    
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to revoke user tokens', error instanceof Error ? error : undefined);
  }
};