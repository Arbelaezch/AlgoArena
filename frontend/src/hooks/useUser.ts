import { useState, useEffect, useCallback } from 'react';
import type { AppError } from '@backend-types';
import { userService, type ExtendedUserProfile, type UpdateUserProfileRequest } from '@/services/userService';
import { getUserFriendlyMessage } from '@/utils/errorUtils';

interface UseUserReturn {
  // State
  profile: ExtendedUserProfile | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
  uploadingAvatar: boolean;
  
  // Actions
  updateProfile: (data: UpdateUserProfileRequest) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  clearError: () => void;
  refetchProfile: () => Promise<void>;
}

/**
 * Simplified user hook focused on ProfilePage needs
 */
export const useUser = (): UseUserReturn => {
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /**
   * Fetch user profile
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await userService.getProfile();
      setProfile(profileData);
    } catch (err) {
      const appError = err as AppError;
      setError(getUserFriendlyMessage(appError));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: UpdateUserProfileRequest): Promise<boolean> => {
    if (!profile) return false;

    try {
      setUpdating(true);
      setError(null);
      
      const updatedProfile = await userService.updateProfile(data);
      setProfile(updatedProfile);
      return true;
    } catch (err) {
      const appError = err as AppError;
      setError(getUserFriendlyMessage(appError));
      return false;
    } finally {
      setUpdating(false);
    }
  }, [profile]);

  /**
   * Upload avatar
   */
  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!profile) return false;

    try {
      setUploadingAvatar(true);
      setError(null);
      
      const { avatarUrl } = await userService.uploadAvatar(file);
      setProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
      return true;
    } catch (err) {
      const appError = err as AppError;
      setError(getUserFriendlyMessage(appError));
      return false;
    } finally {
      setUploadingAvatar(false);
    }
  }, [profile]);

  /**
   * Delete avatar
   */
  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;

    try {
      setUpdating(true);
      setError(null);
      
      await userService.deleteAvatar();
      setProfile(prev => prev ? { ...prev, avatar: undefined } : null);
      return true;
    } catch (err) {
      const appError = err as AppError;
      setError(getUserFriendlyMessage(appError));
      return false;
    } finally {
      setUpdating(false);
    }
  }, [profile]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refetch profile
   */
  const refetchProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updating,
    uploadingAvatar,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    clearError,
    refetchProfile
  };
};