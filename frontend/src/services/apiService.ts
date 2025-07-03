import type { AxiosInstance } from 'axios';

import { createHttpClient } from './api/client';
import { setupInterceptors } from './api/interceptors';

/**
 * Core API service that provides HTTP client and interceptor utilities
 */
export class ApiService {
  private client: AxiosInstance;
  private interceptorUtils: ReturnType<typeof setupInterceptors>;

  constructor(baseURL?: string) {
    this.client = createHttpClient(baseURL);
    this.interceptorUtils = setupInterceptors(this.client);
  }

  /**
   * Get the underlying Axios client for making requests
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Get interceptor utilities for auth services
   */
  getInterceptorUtils() {
    return this.interceptorUtils;
  }

  /**
   * Manual refresh method for testing
   */
  async manualRefresh(): Promise<void> {
    await this.interceptorUtils.manualRefresh();
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();