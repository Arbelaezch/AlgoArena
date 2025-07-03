import type { AxiosInstance } from 'axios';
import axios from 'axios';

import { env } from '@/config/env';

/**
 * Extend Axios types to include custom properties
 */
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/**
 * Creates and configures the base HTTP client
 */
export function createHttpClient(baseURL: string = env.BACKEND_API_URL): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });
}