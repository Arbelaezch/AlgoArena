import type { ErrorCode, ErrorDetails } from './error.js';

// Pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query filter base interface - KEEP (utility interface for filtering)
export interface BaseQueryFilters {
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

// Standard API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
  requestId?: string;
  meta?: {
    pagination?: PaginatedResponse<any>['pagination'];
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    timestamp: string;
    path: string;
    requestId?: string;
    details?: ErrorDetails | ErrorDetails[];
  };
}

// Union type for all API responses
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;