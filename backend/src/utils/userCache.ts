import { getRedisClient } from '../config/redis.js';
import { User } from '../models/User.js';
import { UserEntity } from '../types/index.js';
import { createExternalServiceError, handleDatabaseError } from './errorHelpers.js';

// Cache configuration
const USER_CACHE_PREFIX = 'user:';
const DEFAULT_CACHE_TTL = 15 * 60; // 15 minutes in seconds
const CACHE_MISS_TTL = 60; // 1 minute for non-existent users

/**
 * Generate cache key for user
 */
const getUserCacheKey = (userId: number): string => {
  return `${USER_CACHE_PREFIX}${userId}`;
};

/**
 * Cache user data in Redis
 */
export const cacheUser = async (user: UserEntity, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = getUserCacheKey(user.id);
    
    // Store user data as JSON with expiration
    await redis.setEx(key, ttlSeconds, JSON.stringify(user));
  } catch (error) {
    // Don't throw - caching failure shouldn't break the flow
    // But log with proper error handling
    const redisError = createExternalServiceError('Redis', 'Failed to cache user data', error instanceof Error ? error : undefined);
    console.error('Caching error (non-fatal):', redisError.message, redisError.details);
  }
};

/**
 * Get user from cache
 */
export const getUserFromCache = async (userId: number): Promise<UserEntity | null> => {
  try {
    const redis = getRedisClient();
    const key = getUserCacheKey(userId);
    
    const cachedUser = await redis.get(key);
    if (!cachedUser) {
      return null;
    }

    // Handle cached "null" for non-existent users
    if (cachedUser === 'null') {
      return null;
    }

    return JSON.parse(cachedUser) as UserEntity;
  } catch (error) {
    // Return null on cache errors - will fall back to database
    const redisError = createExternalServiceError('Redis', 'Failed to get user from cache', error instanceof Error ? error : undefined);
    console.error('Cache retrieval error (non-fatal):', redisError.message, redisError.details);
    return null;
  }
};

/**
 * Cache that a user doesn't exist (to prevent repeated DB queries for invalid user IDs)
 */
export const cacheUserNotFound = async (userId: number): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = getUserCacheKey(userId);
    
    // Cache "null" for a shorter time to handle edge cases
    await redis.setEx(key, CACHE_MISS_TTL, 'null');
  } catch (error) {
    // Don't throw - caching failure shouldn't break the flow
    const redisError = createExternalServiceError('Redis', 'Failed to cache user not found', error instanceof Error ? error : undefined);
    console.error('Cache miss storage error (non-fatal):', redisError.message, redisError.details);
  }
};

/**
 * Get user with caching - checks cache first, falls back to database
 */
export const getUserWithCache = async (userId: number): Promise<UserEntity | null> => {
  try {
    // Try cache first
    const cachedUser = await getUserFromCache(userId);
    if (cachedUser !== null) {
      return cachedUser;
    }

    // Cache miss - get from database
    const user = await User.findById(userId);
    
    if (user) {
      // Cache the user for future requests
      await cacheUser(user);
      return user;
    } else {
      // Cache that user doesn't exist to prevent repeated DB queries
      await cacheUserNotFound(userId);
      return null;
    }
  } catch (error) {
    // For cache errors, fall back to database
    if (error && typeof error === 'object' && 'service' in error && error.service === 'Redis') {
      console.error('Cache error, falling back to database:', error);
    } else {
      // Database error - handle properly
      console.error('Database error in getUserWithCache:', error);
    }
    
    // Fall back to database query
    try {
      return await User.findById(userId);
    } catch (dbError) {
      // Both cache and DB failed - throw proper error
      throw handleDatabaseError(dbError);
    }
  }
};

/**
 * Invalidate user cache (call when user data is updated)
 */
export const invalidateUserCache = async (userId: number): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = getUserCacheKey(userId);
    
    await redis.del(key);
  } catch (error) {
    // Don't throw - cache invalidation failure shouldn't break the flow
    const redisError = createExternalServiceError('Redis', 'Failed to invalidate user cache', error instanceof Error ? error : undefined);
    console.error('Cache invalidation error (non-fatal):', redisError.message, redisError.details);
  }
};

/**
 * Refresh user cache (get from DB and update cache)
 */
export const refreshUserCache = async (userId: number): Promise<UserEntity | null> => {
  try {
    // First invalidate existing cache
    await invalidateUserCache(userId);
    
    // Get fresh data from database
    const user = await User.findById(userId);
    
    if (user) {
      // Cache the fresh data
      await cacheUser(user);
      return user;
    } else {
      // Cache that user doesn't exist
      await cacheUserNotFound(userId);
      return null;
    }
  } catch (error) {
    console.error('Error refreshing user cache:', error);
    // Re-throw database errors, but handle cache errors gracefully
    if (error && typeof error === 'object' && 'service' in error && error.service === 'Redis') {
      return null; // Cache error - return null
    }
    throw handleDatabaseError(error); // Database error - throw proper error
  }
};

/**
 * Get multiple users with caching (batch operation)
 */
export const getUsersWithCache = async (userIds: number[]): Promise<(UserEntity | null)[]> => {
  const results: (UserEntity | null)[] = [];
  const uncachedIds: number[] = [];
  const uncachedIndices: number[] = [];

  // First, try to get all users from cache
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const cachedUser = await getUserFromCache(userId);
    
    if (cachedUser !== null) {
      results[i] = cachedUser;
    } else {
      results[i] = null; // Placeholder
      uncachedIds.push(userId);
      uncachedIndices.push(i);
    }
  }

  // If we have uncached users, fetch them from database
  if (uncachedIds.length > 0) {
    try {
      // Fetch multiple users from database
      const uncachedUsers = await Promise.all(
        uncachedIds.map(id => User.findById(id))
      );

      // Cache the results and update the results array
      for (let i = 0; i < uncachedUsers.length; i++) {
        const user = uncachedUsers[i];
        const resultIndex = uncachedIndices[i];
        const userId = uncachedIds[i];

        if (user) {
          await cacheUser(user);
          results[resultIndex] = user;
        } else {
          await cacheUserNotFound(userId);
          results[resultIndex] = null;
        }
      }
    } catch (error) {
      // Handle database errors properly
      throw handleDatabaseError(error);
    }
  }

  return results;
};