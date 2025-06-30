import { EventEmitter } from 'events';

import { invalidateUserCache } from '../utils/userCache.js';

// Single event emitter for user changes
export const userEvents = new EventEmitter();

// Simple event - just "user changed"
export const USER_CHANGED = 'user.changed';

/**
 * Emit user changed event - will trigger cache invalidation
 */
export const userChanged = (userId: number): void => {
  userEvents.emit(USER_CHANGED, userId);
};

/**
 * Initialize cache invalidation handler
 * Call this once during app startup
 */
export const initializeUserCacheHandlers = (): void => {
  userEvents.on(USER_CHANGED, async (userId: number) => {
    try {
      await invalidateUserCache(userId);
    } catch (error) {
      console.error(`Failed to invalidate cache for user ${userId}:`, error);
      // Don't throw - cache errors shouldn't break the app
    }
  });
  
  console.log('✅ User cache handlers initialized');
};