import type { UserEntity, LoginRequest, RegisterRequest, AuthResponse } from '@backend-types';
import { parseApiError } from '@/utils/errorUtils';
import { TokenManager } from '@/utils/tokenManager';
import { apiService } from './apiService';

/**
 * Authentication service for handling user auth operations
 */
export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiService.getClient().post<{
        success: true;
        data: AuthResponse;
        message: string;
      }>('/auth/login', credentials);

      const authData = response.data.data;

      TokenManager.setTokens(authData.tokens.accessToken, authData.tokens.refreshToken);
      
      // Schedule the first refresh
      apiService.getInterceptorUtils().scheduleTokenRefresh();
      
      return authData;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiService.getClient().post<{
        success: true;
        data: AuthResponse;
        message: string;
      }>('/auth/register', userData);
      
      const authData = response.data.data;
      
      TokenManager.setTokens(authData.tokens.accessToken, authData.tokens.refreshToken);
      
      // Schedule the first refresh
      apiService.getInterceptorUtils().scheduleTokenRefresh();
      
      return authData;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProfile(): Promise<UserEntity> {
    try {
      const response = await apiService.getClient().get<{
        success: true;
        data: { user: UserEntity };
        message: string;
      }>('/auth/profile');
      
      return response.data.data.user;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      // Clear refresh timer first
      apiService.getInterceptorUtils().clearRefreshTimer();

      await apiService.getClient().post('/auth/logout', {
        refreshToken: TokenManager.getRefreshToken()
      });
    } catch (error) {
      console.warn('Logout request failed:', parseApiError(error));
    } finally {
      TokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
  },

  async logoutAll(): Promise<void> {
    try {
      // Clear refresh timer first
      apiService.getInterceptorUtils().clearRefreshTimer();

      await apiService.getClient().post('/auth/logout-all');
    } catch (error) {
      console.warn('Logout all request failed:', parseApiError(error));
    } finally {
      TokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
  },

  isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    return token !== null && !TokenManager.isTokenExpired(token);
  },

  getTokenInfo(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenExpiry: number | null;
    isAccessTokenExpired: boolean;
    isAccessTokenExpiringSoon: boolean;
  } {
    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();
    
    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenExpiry: accessToken ? TokenManager.getTokenExpiryTime(accessToken) : null,
      isAccessTokenExpired: accessToken ? TokenManager.isTokenExpired(accessToken) : true,
      isAccessTokenExpiringSoon: accessToken ? TokenManager.isTokenExpiringSoon(accessToken) : true,
    };
  }
};