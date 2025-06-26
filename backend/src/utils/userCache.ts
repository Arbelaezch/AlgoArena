import { getRedisClient } from '../config/redis';
import { UserModel } from '../models/User';
import { User } from '../types';

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
export const cacheUser = async (user: User, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<void> => {
  try {
    const redis = getRedisClient();
    const key = getUserCacheKey(user.id);
    
    // Store user data as JSON with expiration
    await redis.setEx(key, ttlSeconds, JSON.stringify(user));
  } catch (error) {
    console.error('Error caching user:', error);
    // Don't throw - caching failure shouldn't break the flow
  }
};

/**
 * Get user from cache
 */
export const getUserFromCache = async (userId: number): Promise<User | null> => {
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

    return JSON.parse(cachedUser) as User;
  } catch (error) {
    console.error('Error getting user from cache:', error);
    // Return null on cache errors - will fall back to database
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
    console.error('Error caching user not found:', error);
    // Don't throw - caching failure shouldn't break the flow
  }
};

/**
 * Get user with caching - checks cache first, falls back to database
 */
export const getUserWithCache = async (userId: number): Promise<User | null> => {
  try {
    // Try cache first
    const cachedUser = await getUserFromCache(userId);
    if (cachedUser !== null) {
      return cachedUser;
    }

    // Cache miss - get from database
    const user = await UserModel.findById(userId);
    
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
    console.error('Error getting user with cache:', error);
    // Fall back to database query on cache errors
    try {
      return await UserModel.findById(userId);
    } catch (dbError) {
      console.error('Database fallback failed:', dbError);
      return null;
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
    console.error('Error invalidating user cache:', error);
    // Don't throw - cache invalidation failure shouldn't break the flow
  }
};

/**
 * Refresh user cache (get from DB and update cache)
 */
export const refreshUserCache = async (userId: number): Promise<User | null> => {
  try {
    // First invalidate existing cache
    await invalidateUserCache(userId);
    
    // Get fresh data from database
    const user = await UserModel.findById(userId);
    
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
    return null;
  }
};

/**
 * Get multiple users with caching (batch operation)
 */
export const getUsersWithCache = async (userIds: number[]): Promise<(User | null)[]> => {
  const results: (User | null)[] = [];
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
      // Assuming you have a method to get multiple users by IDs
      // If not, you'll need to implement this or use individual queries
      const uncachedUsers = await Promise.all(
        uncachedIds.map(id => UserModel.findById(id))
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
      console.error('Error fetching uncached users:', error);
    }
  }

  return results;
};