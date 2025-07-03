import type { Request } from 'express';

import { UserEntity, CreateUserRequest } from '../types/user.js';
import { AuthResponse, LoginRequest, RefreshTokenRequest } from '../types/auth.js';
import { User } from '../models/User.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import {
  storeRefreshToken,
  removeRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  revokeAllUserTokens
} from '../utils/redisTokens.js';
import {
  createUserSession,
  destroyUserSession,
  addFlashMessage,
  updateSessionActivity,
  revokeAllUserSessions
} from './sessionService.js';
import { comparePassword } from '../utils/password.js';
import {
  createAuthError,
  createValidationError,
  createNotFoundError,
  createConflictError,
  handleDatabaseError
} from '../utils/errorHelpers.js';
import { ERROR_CODES } from '../types/error.js';

/**
 * Authentication Service
 * 
 * Provides JWT + Session authentication for all operations.
 * Users always get both JWT tokens and server sessions for maximum flexibility.
 */
export class AuthService {

  /**
   * Register a new user (creates both JWT tokens and session)
   */
  async register(userData: CreateUserRequest, req: Request): Promise<AuthResponse> {
    const { email, password, username, first_name, last_name } = userData;

    // Validate required fields
    if (!email || !password || !username) {
      const errors = [];
      if (!email) errors.push({ field: 'email', message: 'Email is required' });
      if (!password) errors.push({ field: 'password', message: 'Password is required' });
      if (!username) errors.push({ field: 'username', message: 'Username is required' });
      
      throw createValidationError('Email, password, and username are required', errors);
    }

    try {
      // Create user
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

      // Create user session
      await createUserSession(req, user);
      addFlashMessage(req, 'success', 'Account created successfully! Welcome aboard.');

      return {
        user,
        tokens,
        session: {
          sessionId: req.sessionID,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
        metadata: {
          loginTime: Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for JWT
        }
      };

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

      throw handleDatabaseError(error);
    }
  }

  /**
   * Login user (creates both JWT tokens and session)
   */
  async login(credentials: LoginRequest, req: Request): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Validate required fields
    if (!email || !password) {
      throw createValidationError('Email and password are required', [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' }
      ]);
    }

    // Find user with password hash
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

    // Create user session
    try {
      await createUserSession(req, user);
      addFlashMessage(req, 'success', 'Welcome back! You have been logged in successfully.');
    } catch (sessionError) {
      // Log session error but don't fail the login
      console.error('Session creation failed during login:', sessionError);
    }

    // Update last login
    await User.updateLastLogin(user.id);

    return {
      user,
      tokens,
      session: {
        sessionId: req.sessionID,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      metadata: {
        loginTime: Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for JWT
      }
    };
  }

  /**
   * Refresh authentication (both JWT and session)
   */
  async refresh(refreshData: RefreshTokenRequest, req: Request): Promise<AuthResponse> {
    const { refreshToken: oldRefreshToken } = refreshData;

    if (!oldRefreshToken) {
      throw createValidationError('Refresh token is required', {
        field: 'refreshToken',
        message: 'Refresh token is required'
      });
    }

    // Check if token is blacklisted
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

    // Immediately blacklist the old refresh token
    await blacklistToken(oldRefreshToken, 60 * 60); // 1 hour
    
    // Remove old token from user's active tokens
    await removeRefreshToken(decoded.userId, oldRefreshToken);

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: decoded.userId,
      email: decoded.email
    });

    // Store new refresh token
    await storeRefreshToken(decoded.userId, tokens.refreshToken);

    // Update session activity if session exists
    if (req.session.user && req.session.user.userId === decoded.userId) {
      updateSessionActivity(req);
    }

    return {
      user,
      tokens,
      session: {
        sessionId: req.sessionID,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      metadata: {
        loginTime: req.session.user?.loginTime || Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for JWT
      }
    };
  }

  /**
   * Logout user (invalidate both JWT and session)
   */
  async logout(req: Request, refreshToken?: string): Promise<void> {
    // Handle JWT logout
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

    // Handle session logout
    try {
      if (req.session.user) {
        await destroyUserSession(req);
        addFlashMessage(req, 'info', 'You have been logged out successfully.');
      }
    } catch (sessionError) {
      // Log session error but don't fail the logout
      console.error('Session destruction failed during logout:', sessionError);
    }
  }

  /**
   * Logout from all devices (revoke all tokens and sessions)
   */
  async logoutAll(req: Request): Promise<void> {
    // Get user from either JWT or session
    const user = req.user || 
                 (req.session.user ? 
                  await User.findById(req.session.user.userId) : null);
    
    if (!user) {
      throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
    }

    try {
      // Revoke all JWT refresh tokens
      await revokeAllUserTokens(user.id);
      
      // Revoke all sessions
      await revokeAllUserSessions(user.id);
    } catch (error) {
      console.error('Failed to logout from all devices:', error);
      throw createAuthError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to logout from all devices');
    }
  }

  /**
   * Verify authentication (check both JWT and session)
   */
  async verify(req: Request): Promise<UserEntity | null> {
    // Check JWT first (from middleware)
    if (req.user) {
      // Update session activity if session exists for the same user
      if (req.session.user && 
          req.session.user.userId === req.user.id) {
        updateSessionActivity(req);
      }
      return req.user;
    }

    // Fall back to session
    if (req.session.user) {
      updateSessionActivity(req);
      const user = await User.findById(req.session.user.userId);
      return user;
    }

    return null;
  }

  /**
   * Get user profile with authentication metadata
   */
  async getProfile(req: Request): Promise<{
    user: UserEntity;
    session?: any;
    metadata?: any;
  }> {
    const user = await this.verify(req);
    
    if (!user) {
      throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
    }

    const sessionData = req.session.user;
    
    return {
      user,
      session: sessionData,
      metadata: {
        loginTime: sessionData?.loginTime,
        lastActivity: sessionData?.lastActivity,
        sessionId: req.sessionID,
        hasJWT: !!req.user,
        hasSession: !!sessionData,
      }
    };
  }

  /**
   * Health check for authentication service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Test JWT functionality
      const testPayload = { userId: 1, email: 'test@example.com' };
      const tokens = generateTokenPair(testPayload);
      
      verifyRefreshToken(tokens.refreshToken);
      
      // Test session configuration
      if (!process.env.SESSION_SECRET) {
        throw new Error('Session configuration missing');
      }

      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;