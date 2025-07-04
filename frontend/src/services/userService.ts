import type { UserProfile, CreateUserRequest } from '@backend-types';
import type { ApiSuccessResponse } from '@backend-types';
import { parseApiError } from '@/utils/errorUtils';
import { apiService } from './apiService';

// Extended user profile interface
export interface ExtendedUserProfile extends UserProfile {
  // Frontend-specific fields
  phone?: string;
  location?: string;
  bio?: string;
  joinDate?: string;
  avatar?: string;
  
  // Trading/portfolio related fields
  totalStrategies?: number;
  activeStrategies?: number;
  portfolioValue?: string;
  rank?: number;
  achievements?: number;
}

// Update profile request interface
export interface UpdateUserProfileRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar?: string;
}

/**
 * User service for handling user-related API operations
 */
export const userService = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<ExtendedUserProfile> {
    try {
      const response = await apiService.getClient().get<ApiSuccessResponse<{ user: ExtendedUserProfile }>>(
        '/users/profile'
      );
      
      if (!response.data.success) {
        throw new Error('Failed to fetch user profile');
      }
      
      // Extract user from the nested structure
      return response.data.data.user;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Update current user's profile
   */
  async updateProfile(profileData: UpdateUserProfileRequest): Promise<ExtendedUserProfile> {
    try {
      const response = await apiService.getClient().patch<ApiSuccessResponse<ExtendedUserProfile>>(
        '/users/profile',
        profileData
      );
      
      if (!response.data.success) {
        throw new Error('Failed to update user profile');
      }
      
      return response.data.data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Get user by ID (public endpoint)
   */
  async getUserById(userId: string): Promise<ExtendedUserProfile> {
    try {
      const response = await apiService.getClient().get<ApiSuccessResponse<ExtendedUserProfile>>(
        `/users/${userId}`
      );
      
      if (!response.data.success) {
        throw new Error('Failed to fetch user');
      }
      
      return response.data.data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiService.getClient().post<ApiSuccessResponse<{ avatarUrl: string }>>(
        '/users/profile/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (!response.data.success) {
        throw new Error('Failed to upload avatar');
      }
      
      return response.data.data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<void> {
    try {
      const response = await apiService.getClient().delete<ApiSuccessResponse<void>>(
        '/users/profile/avatar'
      );
      
      if (!response.data.success) {
        throw new Error('Failed to delete avatar');
      }
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Record<string, any>): Promise<void> {
    try {
      const response = await apiService.getClient().patch<ApiSuccessResponse<void>>(
        '/users/profile/preferences',
        preferences
      );
      
      if (!response.data.success) {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Get user's trading statistics
   */
  async getStats(): Promise<{
    totalStrategies: number;
    activeStrategies: number;
    portfolioValue: string;
    rank: number;
    achievements: number;
    performanceData?: any;
  }> {
    try {
      const response = await apiService.getClient().get<ApiSuccessResponse<{
        totalStrategies: number;
        activeStrategies: number;
        portfolioValue: string;
        rank: number;
        achievements: number;
        performanceData?: any;
      }>>('/users/profile/stats');
      
      if (!response.data.success) {
        throw new Error('Failed to fetch user stats');
      }
      
      return response.data.data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await apiService.getClient().patch<ApiSuccessResponse<void>>(
        '/users/profile/password',
        {
          currentPassword,
          newPassword
        }
      );
      
      if (!response.data.success) {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Deactivate user account
   */
  async deactivateAccount(password: string): Promise<void> {
    try {
      const response = await apiService.getClient().delete<ApiSuccessResponse<void>>(
        '/users/profile',
        {
          data: { password }
        }
      );
      
      if (!response.data.success) {
        throw new Error('Failed to deactivate account');
      }
    } catch (error) {
      throw parseApiError(error);
    }
  }
};