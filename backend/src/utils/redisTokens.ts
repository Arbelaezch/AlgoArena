import { getRedisClient } from '../config/redis';

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
    console.error('Error blacklisting token:', error);
    throw new Error('Failed to blacklist token');
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
    console.error('Error checking token blacklist:', error);
    // In case of Redis error, err on the side of caution
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
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
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
    console.error('Error removing refresh token:', error);
    // Don't throw - this is cleanup, continue anyway
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
    console.error('Error getting user refresh tokens:', error);
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
    console.error('Error revoking all user tokens:', error);
    throw new Error('Failed to revoke user tokens');
  }
};