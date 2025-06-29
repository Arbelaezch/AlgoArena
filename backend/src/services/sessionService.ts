import { Request } from 'express';
import { UserSessionData } from '../types/session';
import { UserEntity } from '../types';
import { getRedisClient } from '../config/redis';
import { sessionConfig } from '../config/session';
import { createExternalServiceError } from '../utils/errorHelpers';

/**
 * Create a new user session
 */
export const createUserSession = async (req: Request, user: UserEntity): Promise<void> => {
  const sessionData: UserSessionData = {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    loginTime: Date.now(),
    lastActivity: Date.now(),
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
    },
    permissions: [], // Add user permissions/roles here
  };

  req.session.user = sessionData;
  
  // Force session save to ensure it's persisted
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(createExternalServiceError('Session', 'Failed to create user session', err));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = (req: Request): void => {
  if (req.session.user) {
    req.session.user.lastActivity = Date.now();
    // Session will auto-save due to modification
  }
};

/**
 * Update user session data
 */
export const updateUserSession = async (req: Request, updates: Partial<UserSessionData>): Promise<void> => {
  if (!req.session.user) {
    throw new Error('No active session to update');
  }

  // Merge updates with existing session data
  req.session.user = {
    ...req.session.user,
    ...updates,
    lastActivity: Date.now(),
  };

  // Force session save
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(createExternalServiceError('Session', 'Failed to update user session', err));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Destroy user session
 */
export const destroyUserSession = async (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(createExternalServiceError('Session', 'Failed to destroy session', err));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Get all active sessions for a user (Redis direct access)
 */
export const getUserActiveSessions = async (userId: number): Promise<string[]> => {
  try {
    const redis = getRedisClient();
    const pattern = `${sessionConfig.prefix}*`;
    
    // Scan for all session keys
    const sessionKeys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor.toString();
      sessionKeys.push(...result.keys);
    } while (cursor !== '0');

    // Filter sessions for the specific user
    const userSessions: string[] = [];
    
    for (const key of sessionKeys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.user && session.user.userId === userId) {
            userSessions.push(key.replace(sessionConfig.prefix, ''));
          }
        } catch (parseError) {
          // Skip invalid session data
          console.warn('Invalid session data found:', key);
        }
      }
    }

    return userSessions;
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to get user active sessions', error instanceof Error ? error : undefined);
  }
};

/**
 * Revoke all sessions for a user (useful for "logout all devices")
 */
export const revokeAllUserSessions = async (userId: number): Promise<void> => {
  try {
    const sessionIds = await getUserActiveSessions(userId);
    
    if (sessionIds.length > 0) {
      const redis = getRedisClient();
      const keysToDelete = sessionIds.map(id => `${sessionConfig.prefix}${id}`);
      await redis.del(keysToDelete);
    }
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to revoke user sessions', error instanceof Error ? error : undefined);
  }
};

/**
 * Get session statistics
 */
export const getSessionStats = async (): Promise<{
  totalActiveSessions: number;
  activeUsers: number;
  oldestSession: number | null;
  newestSession: number | null;
}> => {
  try {
    const redis = getRedisClient();
    const pattern = `${sessionConfig.prefix}*`;
    
    const sessionKeys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor.toString();
      sessionKeys.push(...result.keys);
    } while (cursor !== '0');

    const userIds = new Set<number>();
    let oldestSession: number | null = null;
    let newestSession: number | null = null;

    for (const key of sessionKeys) {
      const sessionData = await redis.get(key);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.user) {
            userIds.add(session.user.userId);
            
            const loginTime = session.user.loginTime;
            if (oldestSession === null || loginTime < oldestSession) {
              oldestSession = loginTime;
            }
            if (newestSession === null || loginTime > newestSession) {
              newestSession = loginTime;
            }
          }
        } catch (parseError) {
          // Skip invalid session data
        }
      }
    }

    return {
      totalActiveSessions: sessionKeys.length,
      activeUsers: userIds.size,
      oldestSession,
      newestSession,
    };
  } catch (error) {
    throw createExternalServiceError('Redis', 'Failed to get session statistics', error instanceof Error ? error : undefined);
  }
};

/**
 * Add flash message to session
 */
export const addFlashMessage = (req: Request, type: 'success' | 'error' | 'info' | 'warning', message: string): void => {
  if (!req.session.flash) {
    req.session.flash = {};
  }
  if (!req.session.flash[type]) {
    req.session.flash[type] = [];
  }
  req.session.flash[type]!.push(message);
};

/**
 * Get and clear flash messages
 */
export const getFlashMessages = (req: Request): NonNullable<Required<Request['session']>['flash']> => {
  const flash = req.session.flash || {};
  req.session.flash = {}; // Clear after reading
  return {
    success: flash.success || [],
    error: flash.error || [],
    info: flash.info || [],
    warning: flash.warning || [],
  };
};