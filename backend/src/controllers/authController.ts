import { Request, Response } from 'express';
import { UserModel } from '../models/User';
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

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, last_name }: CreateUserRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Please provide a valid email address'
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
      return;
    }

    // Create user
    const user = await UserModel.create({
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

    res.status(201).json({
      message: 'User registered successfully',
      data: response
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message === 'User with this email already exists') {
      res.status(409).json({
        error: 'User with this email already exists'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required'
      });
      return;
    }

    // Find user with password hash
    const userWithPassword = await UserModel.findByEmailWithPassword(email.toLowerCase().trim());
    
    if (!userWithPassword) {
      res.status(401).json({
        error: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, userWithPassword.password_hash);
    
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid email or password'
      });
      return;
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

    res.status(200).json({
      message: 'Login successful',
      data: response
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'User not authenticated'
      });
      return;
    }

    res.status(200).json({
      message: 'Profile retrieved successfully',
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Refresh access token using refresh token (with rotation and Redis tracking)
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: oldRefreshToken }: RefreshTokenRequest = req.body;

    if (!oldRefreshToken) {
      res.status(400).json({
        error: 'Refresh token is required'
      });
      return;
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await isTokenBlacklisted(oldRefreshToken);
    if (isBlacklisted) {
      res.status(401).json({
        error: 'Refresh token has been revoked'
      });
      return;
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (error) {
      res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
      return;
    }

    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: 'User not found'
      });
      return;
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

    res.status(200).json({
      message: 'Token refreshed successfully',
      data: response
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Logout user (invalidate refresh token using Redis)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};