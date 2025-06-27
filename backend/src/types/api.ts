// Standard API response wrapper
export interface ApiResponse<T = any> {
    message: string;
    data: T;
    success: boolean;
  }
  
  // API Error response structure
  export interface ApiError {
    error: string;
    details?: string[];
    field?: string;
    code?: string;
    timestamp?: string;
  }
  
  // Pagination interfaces
  export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
  
  // Query filter base interface
  export interface BaseQueryFilters {
    search?: string;
    createdAfter?: string;
    createdBefore?: string;
  }
  
  // HTTP status codes enum for consistency
  export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    INTERNAL_SERVER_ERROR = 500,
  }