import type { Request, Response } from 'express';

import { authService } from '../services/authService.js';
import { CreateUserRequest } from '../types/index.js';
import { LoginRequest, RefreshTokenRequest } from '../types/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createValidationError,
  createConflictError,
  createNotFoundError,
  createAuthError,
  handleDatabaseError
} from '../utils/errorHelpers.js';
import { sendSuccessResponse, sendCreatedResponse } from '../utils/responseHelpers.js';
import { ERROR_CODES } from '../types/error.js';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request<{}, {}, CreateUserRequest>, res: Response) => {
  const result = await authService.register(req.body, req);
  sendCreatedResponse(res, result, 'User registered successfully');
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  const result = await authService.login(req.body, req);
  sendSuccessResponse(res, result, 'Login successful');
});

/**
 * Refresh authentication tokens/session
 */
export const refreshToken = asyncHandler(async (req: Request<{}, {}, RefreshTokenRequest>, res: Response) => {
  const result = await authService.refresh(req.body, req);
  sendSuccessResponse(res, result, 'Authentication refreshed successfully');
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profileData = await authService.getProfile(req);
  sendSuccessResponse(res, profileData, 'Profile retrieved successfully');
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await authService.logout(req, refreshToken);
  sendSuccessResponse(res, null, 'Logout successful');
});

/**
 * Logout user from all devices/sessions
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req);
  sendSuccessResponse(res, null, 'Logged out from all devices successfully');
});

/**
 * Get detailed session information
 */
export const getSessionInfo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.user) {
    return sendSuccessResponse(res, {
      authenticated: false,
      sessionId: req.sessionID,
    }, 'No active session');
  }

  const sessionInfo = {
    authenticated: true,
    user: {
      id: req.session.user.userId,
      email: req.session.user.email,
      role: req.session.user.role,
      loginTime: req.session.user.loginTime,
      lastActivity: req.session.user.lastActivity,
      preferences: req.session.user.preferences,
    },
    session: {
      id: req.sessionID,
      maxAge: req.session.cookie.maxAge,
      timeRemaining: req.session.cookie.maxAge ? Math.max(0, req.session.cookie.maxAge) : null,
    },
  };

  sendSuccessResponse(res, sessionInfo, 'Session info retrieved successfully');
});

/**
 * Update session preferences
 */
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const { theme, language, timezone } = req.body;
  
  if (!req.session.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'No active session');
  }

  const updates: any = {};
  if (req.session.user.preferences) {
    updates.preferences = { ...req.session.user.preferences };
  } else {
    updates.preferences = {};
  }

  if (theme && ['light', 'dark'].includes(theme)) {
    updates.preferences.theme = theme;
  }
  if (language) {
    updates.preferences.language = language;
  }
  if (timezone) {
    updates.preferences.timezone = timezone;
  }

  // Update session using the service
  const { updateUserSession } = await import('../services/sessionService');
  await updateUserSession(req, updates);

  sendSuccessResponse(res, {
    preferences: updates.preferences,
  }, 'Preferences updated successfully');
});

/**
 * Get user's active sessions
 */
export const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const requestedUserId = userId ? parseInt(userId) : req.user?.id;
  
  if (!requestedUserId) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'User ID required');
  }

  const currentUser = req.user!;
  const isAdmin = ['admin', 'superadmin'].includes(currentUser.role);

  // Check if user can view these sessions
  if (requestedUserId !== currentUser.id && !isAdmin) {
    throw createAuthError(ERROR_CODES.FORBIDDEN, 'You can only view your own sessions');
  }

  try {
    const { getUserActiveSessions } = await import('../services/sessionService');
    const sessionIds = await getUserActiveSessions(requestedUserId);
    
    sendSuccessResponse(res, {
      userId: requestedUserId,
      activeSessions: sessionIds.length,
      sessionIds: isAdmin ? sessionIds : [req.sessionID], // Only show current session to non-admins
    }, 'Active sessions retrieved successfully');
  } catch (error) {
    console.error('Get sessions error:', error);
    throw createAuthError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to retrieve active sessions');
  }
});

/**
 * Get flash messages
 */
export const getFlashMessages = asyncHandler(async (req: Request, res: Response) => {
  const { getFlashMessages } = await import('../services/sessionService');
  const messages = getFlashMessages(req);
  
  sendSuccessResponse(res, messages, 'Flash messages retrieved successfully');
});

/**
 * Add flash message
 */
export const addFlashMessage = asyncHandler(async (req: Request, res: Response) => {
  const { type, message } = req.body;
  
  if (!type || !message) {
    throw createValidationError('Type and message are required', [
      { field: 'type', message: 'Message type is required' },
      { field: 'message', message: 'Message content is required' }
    ]);
  }

  if (!['success', 'error', 'info', 'warning'].includes(type)) {
    throw createValidationError('Invalid message type', {
      field: 'type',
      value: type,
      constraint: 'must be one of: success, error, info, warning'
    });
  }

  const { addFlashMessage } = await import('../services/sessionService');
  addFlashMessage(req, type, message);
  
  sendSuccessResponse(res, null, 'Flash message added successfully');
});

/**
 * Health check for authentication service
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  const health = await authService.healthCheck();
  
  if (health.status === 'healthy') {
    sendSuccessResponse(res, health, 'Authentication service is healthy');
  } else {
    // Throw error to let error handler format it properly
    throw new Error(`Authentication service is unhealthy: ${health.error}`);
  }
});