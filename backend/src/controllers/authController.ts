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
  CreateUserRequest, 
  LoginRequest, 
  AuthResponse, 
  AuthenticatedRequest,
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
  const { email, password, first_name, last_name } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw createValidationError('Email and password are required', [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
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
    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
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

    const response: AuthResponse = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user
    };

    sendCreatedResponse(res, response, 'User registered successfully');

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'message' in error && 
        error.message === 'User with this email already exists') {
      throw createConflictError('User with this email already exists', {
        field: 'email',
        value: email
      });
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

  // Find user with password hash
  const userWithPassword = await User.findByEmailWithPassword(email.toLowerCase().trim());
  
  if (!userWithPassword) {
    throw createAuthError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, userWithPassword.password_hash);
  
  if (!isPasswordValid) {
    throw createAuthError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
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
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
  }

  sendSuccessResponse(res, { user: req.user }, 'Profile retrieved successfully');
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

  const response: RefreshTokenResponse = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken // Always rotate refresh token
  };

  sendSuccessResponse(res, response, 'Token refreshed successfully');
});

/**
 * Logout user (invalidate refresh token using Redis)
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

  // Optional: Also blacklist access token for immediate revocation
  // const authHeader = req.headers.authorization;
  // if (authHeader && authHeader.startsWith('Bearer ')) {
  //   const accessToken = authHeader.substring(7);
  //   await blacklistToken(accessToken, 15 * 60); // 15 minutes (access token expiry)
  // }

  sendSuccessResponse(res, null, 'Logout successful');
});