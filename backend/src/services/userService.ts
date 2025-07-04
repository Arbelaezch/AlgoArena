import { User } from '../models/User.js';
import { UserEntity } from '../types/user.js';
import { 
  createNotFoundError, 
  createConflictError, 
  createValidationError 
} from '../utils/errorHelpers.js';
import { ERROR_CODES } from '../types/error.js';

export interface UpdateUserProfileRequest {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar?: string;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: number): Promise<UserEntity> {
    const user = await User.findById(userId);
    if (!user) {
      throw createNotFoundError('User not found');
    }
    return user;
  }

  /**
   * Update user profile with validation
   */
  static async updateUserProfile(
    userId: number, 
    updateData: UpdateUserProfileRequest
  ): Promise<UserEntity> {
    // Validate that user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      throw createNotFoundError('User not found');
    }

    // Validate email uniqueness if being updated
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await User.emailExists(updateData.email);
      if (emailExists) {
        throw createConflictError('Email is already taken');
      }
    }

    // Validate username uniqueness if being updated
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await User.usernameExists(updateData.username);
      if (usernameExists) {
        throw createConflictError('Username is already taken');
      }
    }

    // Filter out any fields that shouldn't be updated by users
    const allowedFields: (keyof UpdateUserProfileRequest)[] = [
      'email',
      'username', 
      'first_name',
      'last_name',
      'phone',
      'location',
      'bio',
      'avatar'
    ];

    const filteredData: Partial<UpdateUserProfileRequest> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Check if there are actually fields to update
    if (Object.keys(filteredData).length === 0) {
      throw createValidationError('No valid fields provided for update', [{
        field: 'profile',
        message: 'At least one valid field must be provided for update'
      }]);
    }

    try {
      const updatedUser = await User.updateProfile(userId, filteredData);
      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }
      return updatedUser;
    } catch (error: any) {
      // Handle database constraint errors with consistent error types
      if (error.message?.includes('Email is already taken')) {
        throw createConflictError('Email is already taken');
      }
      if (error.message?.includes('Username is already taken')) {
        throw createConflictError('Username is already taken');
      }
      throw error;
    }
  }

  /**
   * Update user avatar
   */
  static async updateUserAvatar(userId: number, avatarUrl: string): Promise<UserEntity> {
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      throw createNotFoundError('User not found');
    }

    const updatedUser = await User.updateAvatar(userId, avatarUrl);
    if (!updatedUser) {
      throw new Error('Failed to update user avatar');
    }
    return updatedUser;
  }

  /**
   * Delete user avatar
   */
  static async deleteUserAvatar(userId: number): Promise<UserEntity> {
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      throw createNotFoundError('User not found');
    }

    const updatedUser = await User.deleteAvatar(userId);
    if (!updatedUser) {
      throw new Error('Failed to delete user avatar');
    }
    return updatedUser;
  }

  /**
   * Validate profile update data
   */
  static validateProfileUpdate(data: UpdateUserProfileRequest): string[] {
    const errors: string[] = [];

    if (data.email !== undefined) {
      if (!data.email || data.email.trim().length === 0) {
        errors.push('Email cannot be empty');
      } else if (!this.isValidEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.username !== undefined) {
      if (!data.username || data.username.trim().length === 0) {
        errors.push('Username cannot be empty');
      } else if (data.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else if (data.username.length > 50) {
        errors.push('Username must be less than 50 characters');
      } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      }
    }

    if (data.first_name !== undefined) {
      if (data.first_name && data.first_name.length > 100) {
        errors.push('First name must be less than 100 characters');
      }
    }

    if (data.last_name !== undefined) {
      if (data.last_name && data.last_name.length > 100) {
        errors.push('Last name must be less than 100 characters');
      }
    }

    if (data.phone !== undefined) {
      if (data.phone && (data.phone.length < 10 || data.phone.length > 20)) {
        errors.push('Phone number must be between 10 and 20 characters');
      }
    }

    if (data.location !== undefined) {
      if (data.location && data.location.length > 255) {
        errors.push('Location must be less than 255 characters');
      }
    }

    if (data.bio !== undefined) {
      if (data.bio && data.bio.length > 1000) {
        errors.push('Bio must be less than 1000 characters');
      }
    }

    if (data.avatar !== undefined) {
      if (data.avatar && data.avatar.length > 500) {
        errors.push('Avatar URL must be less than 500 characters');
      }
    }

    return errors;
  }

  /**
   * Simple email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}