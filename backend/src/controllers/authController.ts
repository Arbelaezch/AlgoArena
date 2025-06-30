import type { Request, Response, NextFunction } from 'express';

import { User } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { comparePassword, validatePassword } from '../utils/password';
import { 
  blacklistToken, 
  isTokenBlacklisted, 
  storeRefreshToken, 
  removeRefreshToken 
} from '../utils/redisTokens';
import { 
  createUserSession, 
  destroyUserSession, 
  addFlashMessage, 
  updateSessionActivity 
} from '../services/sessionService';
import { 
  CreateUserRequest, 
  LoginRequest, 
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  createValidationError, 
  createConflictError, 
  createNotFoundError,
  createAuthError,
  handleDatabaseError 
} from '../utils/errorHelpers';
import { sendSuccessResponse, sendCreatedResponse } from '../utils/responseHelpers';
import { ERROR_CODES } from '../types/error';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request<{}, {}, CreateUserRequest>, res: Response) => {
  const { email, password, username, first_name, last_name } = req.body;

  // Validate required fields
  if (!email || !password || !username) {
    const errors = [];
    if (!email) errors.push({ field: 'email', message: 'Email is required' });
    if (!password) errors.push({ field: 'password', message: 'Password is required' });
    if (!username) errors.push({ field: 'username', message: 'Username is required' });
    
    throw createValidationError('Email, password, and username are required', errors);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError('Please provide a valid email address', {
      field: 'email',
      value: email,
      constraint: 'email_format'
    });
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    throw createValidationError('Username can only contain letters, numbers, and underscores', {
      field: 'username',
      value: username,
      constraint: 'username_format'
    });
  }

  // Validate username length
  if (username.length < 3 || username.length > 30) {
    throw createValidationError('Username must be between 3 and 30 characters', {
      field: 'username',
      value: username,
      constraint: 'username_length'
    });
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw createValidationError('Password does not meet requirements', {
      field: 'password',
      constraint: 'password_strength',
      details: passwordValidation.errors
    });
  }

  try {
    // Create user - ensure username is properly passed and trimmed
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      username: username.trim(),
      first_name: first_name?.trim(),
      last_name: last_name?.trim()
    });

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email
    });

    // Store refresh token in Redis
    await storeRefreshToken(user.id, tokens.refreshToken);

    await createUserSession(req, user);
    addFlashMessage(req, 'success', 'Account created successfully! Welcome aboard.');

    const response: AuthResponse = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user
    };

    sendCreatedResponse(res, response, 'User registered successfully');

  } catch (error: unknown) {
    // Handle specific user creation errors
    if (error && typeof error === 'object' && 'message' in error) {
      if (error.message === 'User with this email already exists') {
        throw createConflictError('User with this email already exists', {
          field: 'email',
          value: email
        });
      }
      if (error.message === 'Username is already taken') {
        throw createConflictError('Username is already taken', {
          field: 'username',
          value: username
        });
      }
      if (error.message === 'User with this email or username already exists') {
        throw createConflictError('User with this email or username already exists', [
          { field: 'email', message: 'Email may already be in use' },
          { field: 'username', message: 'Username may already be taken' }
        ]);
      }
    }

    // Handle database-specific errors
    throw handleDatabaseError(error);
  }
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw createValidationError('Email and password are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  }

  // Find user with password hash (support both email and username for login)
  const userWithPassword = await User.findByEmailOrUsernameWithPassword(email.toLowerCase().trim());
  
  if (!userWithPassword) {
    throw createAuthError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/username or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, userWithPassword.password_hash);
  
  if (!isPasswordValid) {
    throw createAuthError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/username or password');
  }

  // Remove password hash from user object
  const { password_hash, ...user } = userWithPassword;

  // Generate JWT tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email
  });

  // Store refresh token in Redis
  await storeRefreshToken(user.id, tokens.refreshToken);

  try {
    await createUserSession(req, user);
    addFlashMessage(req, 'success', 'Welcome back! You have been logged in successfully.');
  } catch (sessionError) {
    // Log session error but don't fail the login
    console.error('Session creation failed during login:', sessionError);
  }

  const response: AuthResponse = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user
  };

  sendSuccessResponse(res, response, 'Login successful');
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
  }

  // Update session activity if session exists
  if (req.session.user) {
    updateSessionActivity(req);
  }

  // Enhanced response with session data if available
  const profileData = {
    user: req.user,
    session: req.session.user ? {
      loginTime: req.session.user.loginTime,
      lastActivity: req.session.user.lastActivity,
      preferences: req.session.user.preferences,
      sessionId: req.sessionID,
    } : null
  };

  sendSuccessResponse(res, profileData, 'Profile retrieved successfully');
});

/**
 * Refresh access token using refresh token (with rotation and Redis tracking)
 */
export const refreshToken = asyncHandler(async (req: Request<{}, {}, RefreshTokenRequest>, res: Response) => {
  const { refreshToken: oldRefreshToken } = req.body;

  if (!oldRefreshToken) {
    throw createValidationError('Refresh token is required', {
      field: 'refreshToken',
      message: 'Refresh token is required'
    });
  }

  // Check if token is blacklisted in Redis
  const isBlacklisted = await isTokenBlacklisted(oldRefreshToken);
  if (isBlacklisted) {
    throw createAuthError(ERROR_CODES.TOKEN_EXPIRED, 'Refresh token has been revoked');
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    throw createAuthError(ERROR_CODES.TOKEN_EXPIRED, 'Invalid or expired refresh token');
  }

  // Verify user still exists and is active
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw createNotFoundError('User', decoded.userId);
  }

  // IMPORTANT: Immediately blacklist the old refresh token
  await blacklistToken(oldRefreshToken, 7 * 24 * 60 * 60); // 7 days
  
  // Remove old token from user's active tokens
  await removeRefreshToken(decoded.userId, oldRefreshToken);

  // Generate new token pair (both access and refresh tokens)
  const tokens = generateTokenPair({
    userId: decoded.userId,
    email: decoded.email
  });

  // Store new refresh token in Redis
  await storeRefreshToken(decoded.userId, tokens.refreshToken);

  // Update session activity if session exists
  if (req.session.user && req.session.user.userId === decoded.userId) {
    updateSessionActivity(req);
  }

  const response: RefreshTokenResponse = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken // Always rotate refresh token
  };

  sendSuccessResponse(res, response, 'Token refreshed successfully');
});

/**
 * Logout user (invalidate refresh token using Redis and destroy session)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  // If refresh token is provided, blacklist it and remove from active tokens
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      // Blacklist the token
      await blacklistToken(refreshToken, 7 * 24 * 60 * 60);
      
      // Remove from user's active tokens
      await removeRefreshToken(decoded.userId, refreshToken);
    } catch (error) {
      // Token might be invalid, but that's okay for logout
      console.log('Token verification failed during logout:', error);
    }
  }

  // Destroy session if it exists
  try {
    if (req.session.user) {
      await destroyUserSession(req);
      addFlashMessage(req, 'info', 'You have been logged out successfully.');
    }
  } catch (sessionError) {
    // Log session error but don't fail the logout
    console.error('Session destruction failed during logout:', sessionError);
  }

  sendSuccessResponse(res, null, 'Logout successful');
});

/**
 * Get current session info (session-specific endpoint)
 */
export const getSessionInfo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.user) {
    return sendSuccessResponse(res, {
      authenticated: false,
      sessionId: req.sessionID,
    }, 'No active session');
  }

  // Update activity timestamp
  updateSessionActivity(req);

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
 * Logout from current session only (keeps other device sessions active)
 */
export const logoutCurrentSession = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (req.session.user) {
      await destroyUserSession(req);
      addFlashMessage(req, 'info', 'Current session ended successfully.');
    }

    sendSuccessResponse(res, null, 'Current session logout successful');
  } catch (error) {
    console.error('Current session logout error:', error);
    throw createAuthError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to logout from current session');
  }
});