import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

import type { AppError } from '@/types/error';
import { parseApiError, createNetworkError } from '@/utils/errorUtils';
import { TokenManager } from '@/utils/tokenManager';
import { env } from '@/config/env';

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: AppError) => void;
}

/**
 * Sets up request and response interceptors for automatic token handling
 */
export function setupInterceptors(client: AxiosInstance) {
  let isRefreshing = false;
  let refreshPromise: Promise<string> | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;
  
  // Queue for requests waiting for token refresh
  const failedQueue: QueueItem[] = [];

  /**
   * Process queued requests after token refresh completes
   */
  function processQueue(error: AppError | null, token: string | null): void {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    
    failedQueue.length = 0;
  }

  /**
   * Refresh the access token using the stored refresh token
   */
  async function refreshAccessToken(): Promise<string> {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    isRefreshing = true;
    
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken || TokenManager.isTokenExpired(refreshToken)) {
        throw createNetworkError('No valid refresh token available');
      }

      refreshPromise = performTokenRefresh(refreshToken);
      const newAccessToken = await refreshPromise;
      
      // Schedule next refresh
      scheduleTokenRefresh();
      
      return newAccessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }

  async function performTokenRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await axios.post<{
        success: true;
        data: { tokens: { accessToken: string; refreshToken: string } };
        message: string;
      }>(`${env.BACKEND_API_URL}/auth/refresh-token`, {
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

  function scheduleTokenRefresh(): void {
    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    const token = TokenManager.getAccessToken();
    if (!token) return;

    const expiryTime = TokenManager.getTokenExpiryTime(token);
    if (!expiryTime) return;

    // Schedule refresh 2 minutes before expiry
    const refreshTime = expiryTime - Date.now() - (2 * 60 * 1000);
    
    if (refreshTime > 0) {
      refreshTimer = setTimeout(() => {
        refreshAccessToken().catch(() => {
          // Silent fail for scheduled refresh - let request interceptor handle auth failures
        });
      }, refreshTime);
    }
  }

  function handleAuthFailure(): void {
    // Clear refresh timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    
    TokenManager.clearTokens();
    
    // Dispatch custom event for auth context to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  // Request interceptor - add auth token and handle proactive refresh
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      const token = TokenManager.getAccessToken();
      
      if (token) {
        if (TokenManager.isTokenExpired(token)) {
          // Token is already expired, refresh before making the request
          try {
            const newToken = await refreshAccessToken();
            config.headers.Authorization = `Bearer ${newToken}`;
          } catch (error) {
            handleAuthFailure();
            throw error;
          }
        } else if (TokenManager.isTokenExpiringSoon(token)) {
          // Token is expiring soon, refresh proactively (don't block the request)
          refreshAccessToken().catch(() => {
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
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          // Another request is already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          }).catch((err) => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;

        try {
          const newAccessToken = await refreshAccessToken();
          processQueue(null, newAccessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as AppError, null);
          handleAuthFailure();
          return Promise.reject(parseApiError(refreshError));
        }
      }

      return Promise.reject(parseApiError(error));
    }
  );

  // Return utility functions for external use
  return {
    scheduleTokenRefresh,
    manualRefresh: refreshAccessToken,
    clearRefreshTimer: () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    }
  };
}