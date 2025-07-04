import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';

import { UserService, UpdateUserProfileRequest } from '../services/userService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createValidationError,
  createNotFoundError,
  createAuthError,
  handleDatabaseError
} from '../utils/errorHelpers.js';
import { sendSuccessResponse } from '../utils/responseHelpers.js';
import { ERROR_CODES } from '../types/error.js';

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user?.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Get current user's profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
  }

  const profileData = await UserService.getUserProfile(req.user.id);
  sendSuccessResponse(res, { user: profileData }, 'Profile retrieved successfully');
});

/**
 * Update current user's profile
 */
export const updateProfile = asyncHandler(async (req: Request<{}, {}, UpdateUserProfileRequest>, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
  }

  const updateData: UpdateUserProfileRequest = req.body;

  // Validate the update data
  const validationErrors = UserService.validateProfileUpdate(updateData);
  if (validationErrors.length > 0) {
    throw createValidationError('Invalid input data', validationErrors.map(error => ({
      field: 'profile',
      message: error
    })));
  }

  try {
    const updatedUser = await UserService.updateUserProfile(req.user.id, updateData);
    sendSuccessResponse(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (error: any) {
    // Handle database-specific errors
    const dbError = handleDatabaseError(error);
    if (dbError !== error) {
      throw dbError;
    }
    throw error; // Re-throw if not handled by handleDatabaseError
  }
});

/**
 * Upload user avatar
 */
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
  }

  // Create a promise wrapper for multer
  const uploadSingle = upload.single('avatar');
  
  await new Promise<void>((resolve, reject) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            reject(createValidationError('File too large', [{
              field: 'avatar',
              message: 'Avatar file must be less than 5MB'
            }]));
            return;
          }
        }
        reject(createValidationError('Invalid file', [{
          field: 'avatar',
          message: err.message || 'File upload failed'
        }]));
        return;
      }
      resolve();
    });
  });

  const file = (req as any).file;
  if (!file) {
    throw createValidationError('No file provided', [{
      field: 'avatar',
      message: 'Avatar file is required'
    }]);
  }

  try {
    // Generate avatar URL (adjust path as needed for your setup)
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    
    const updatedUser = await UserService.updateUserAvatar(req.user!.id, avatarUrl);
    sendSuccessResponse(res, { user: updatedUser, avatarUrl }, 'Avatar uploaded successfully');
  } catch (error: any) {
    const dbError = handleDatabaseError(error);
    if (dbError !== error) {
      throw dbError;
    }
    throw error;
  }
});

/**
 * Delete user avatar
 */
export const deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createAuthError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
  }

  try {
    const updatedUser = await UserService.deleteUserAvatar(req.user.id);
    sendSuccessResponse(res, { user: updatedUser }, 'Avatar deleted successfully');
  } catch (error: any) {
    const dbError = handleDatabaseError(error);
    if (dbError !== error) {
      throw dbError;
    }
    throw error;
  }
});

/**
 * Get user by ID (for admin or public profiles)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId) || userId <= 0) {
    throw createValidationError('Invalid user ID', [{
      field: 'id',
      message: 'User ID must be a valid positive number'
    }]);
  }

  try {
    const user = await UserService.getUserProfile(userId);
    sendSuccessResponse(res, { user }, 'User retrieved successfully');
  } catch (error: any) {
    // Check if it's our custom NotFoundError or similar
    if (error.constructor.name === 'NotFoundError' || error.statusCode === 404) {
      throw createNotFoundError('User', userId.toString());
    }
    
    // Handle other database errors
    const dbError = handleDatabaseError(error);
    if (dbError !== error) {
      throw dbError;
    }
    throw error; // Re-throw if not handled
  }
});