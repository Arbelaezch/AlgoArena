import type { AxiosInstance } from 'axios';
import axios from 'axios';

import type { UserEntity, LoginRequest, RegisterRequest, AuthResponse } from '@backend-types';
import { parseApiError, createNetworkError } from '@/utils/errorUtils';

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

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
}

export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

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
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = TokenManager.getAccessToken();
        if (token && !TokenManager.isTokenExpired(token)) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(parseApiError(error))
    );

    // Response interceptor - handle token refresh and errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.handleAuthFailure();
            return Promise.reject(parseApiError(refreshError));
          }
        }

        return Promise.reject(parseApiError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw createNetworkError('No refresh token available');
      }

      this.refreshPromise = this.performTokenRefresh(refreshToken);
      const newAccessToken = await this.refreshPromise;
      
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

  private handleAuthFailure(): void {
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
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export token manager for testing or advanced usage
export { TokenManager };