import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import type { UserEntity, LoginRequest, RegisterRequest, AuthResponse } from '@backend-types';
import type { AppError } from '@/types/error';
import { parseApiError, createNetworkError } from '@/utils/errorUtils';

/**
 * Extend Axios types to include custom properties
 */
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/**
 * Token management utility for handling JWT access and refresh tokens
 * Provides secure storage, validation, and expiry checking
 */
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if a JWT token has expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return true; // Invalid JWT format
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Check if a JWT token is expiring soon (within the refresh buffer)
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return true; // Invalid JWT format
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return Date.now() >= (payload.exp * 1000) - this.TOKEN_REFRESH_BUFFER;
    } catch {
      return true;
    }
  }

  /**
   * Get the expiry time of a JWT token in milliseconds
   */
  static getTokenExpiryTime(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return null;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  }
}

/**
 * Enhanced API client with automatic token refresh and queue management
 * Handles JWT authentication with proactive token renewal
 */
export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  
  // Queue for requests waiting for token refresh
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: AppError) => void;
  }> = [];

  constructor(baseURL: string = import.meta.env['VITE_BACKEND_API_URL'] || 'http://localhost:5000/api') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
    this.scheduleTokenRefresh();
  }

  /**
   * Set up request and response interceptors for automatic token handling
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token and handle proactive refresh
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
        const token = TokenManager.getAccessToken();
        
        if (token) {
          if (TokenManager.isTokenExpired(token)) {
            // Token is already expired, refresh before making the request
            try {
              const newToken = await this.refreshAccessToken();
              config.headers.Authorization = `Bearer ${newToken}`;
            } catch (error) {
              this.handleAuthFailure();
              throw error;
            }
          } else if (TokenManager.isTokenExpiringSoon(token)) {
            // Token is expiring soon, refresh proactively (don't block the request)
            this.refreshAccessToken().catch(() => {
              // Silent fail for proactive refresh
            });
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(parseApiError(error))
    );

    // Response interceptor - handle 401 errors with token refresh and retry
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Another request is already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.processQueue(null, newAccessToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError as AppError, null);
            this.handleAuthFailure();
            return Promise.reject(parseApiError(refreshError));
          }
        }

        return Promise.reject(parseApiError(error));
      }
    );
  }

  /**
   * Process queued requests after token refresh completes
   */
  private processQueue(error: AppError | null, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * Refresh the access token using the stored refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken || TokenManager.isTokenExpired(refreshToken)) {
        throw createNetworkError('No valid refresh token available');
      }

      this.refreshPromise = this.performTokenRefresh(refreshToken);
      const newAccessToken = await this.refreshPromise;
      
      // Schedule next refresh
      this.scheduleTokenRefresh();
      
      return newAccessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post<{
        success: true;
        data: AuthResponse;
        message: string;
      }>(`${this.client.defaults.baseURL}/auth/refresh-token`, {
        refreshToken,
      }, {
        withCredentials: true,
        timeout: 10000,
      });

      const responseData = response.data.data;
      const { tokens } = responseData;
      
      TokenManager.setTokens(
        tokens.accessToken, 
        tokens.refreshToken
      );

      return tokens.accessToken;
    } catch (error) {
      throw parseApiError(error);
    }
  }

  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const expiryTime = TokenManager.getTokenExpiryTime(token);
    if (!expiryTime) return;

    // Schedule refresh 2 minutes before expiry
    const refreshTime = expiryTime - Date.now() - (2 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken().catch(() => {
          // Silent fail for scheduled refresh - let request interceptor handle auth failures
        });
      }, refreshTime);
    }
  }

  private handleAuthFailure(): void {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    TokenManager.clearTokens();
    
    // Dispatch custom event for auth context to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<{
        success: true;
        data: AuthResponse;
        message: string;
      }>('/auth/login', credentials);

      const authData = response.data.data;

      TokenManager.setTokens(authData.tokens.accessToken, authData.tokens.refreshToken);
      
      // Schedule the first refresh
      this.scheduleTokenRefresh();
      
      return authData;
    } catch (error) {
      throw parseApiError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<{
        success: true;
        data: AuthResponse;
        message: string;
      }>('/auth/register', userData);
      
      const authData = response.data.data;
      
      TokenManager.setTokens(authData.tokens.accessToken, authData.tokens.refreshToken);
      
      // Schedule the first refresh
      this.scheduleTokenRefresh();
      
      return authData;
    } catch (error) {
      throw parseApiError(error);
    }
  }

  async getProfile(): Promise<UserEntity> {
    try {
      const response = await this.client.get<{
        success: true;
        data: { user: UserEntity };
        message: string;
      }>('/auth/profile');
      
      return response.data.data.user;
    } catch (error) {
      throw parseApiError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear refresh timer first
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      await this.client.post('/auth/logout', {
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
  }

  async logoutAll(): Promise<void> {
    try {
      // Clear refresh timer first
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      await this.client.post('/auth/logout-all');
    } catch (error) {
      console.warn('Logout all request failed:', parseApiError(error));
    } finally {
      TokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    return token !== null && !TokenManager.isTokenExpired(token);
  }

  getClient(): AxiosInstance {
    return this.client;
  }

  // Manual refresh method for testing
  async manualRefresh(): Promise<void> {
    await this.refreshAccessToken();
  }

  // Get token info for debugging
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
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export token manager for testing or advanced usage
export { TokenManager };