export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",

  // Business Logic
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // External Services
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",

  // System
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown;
}

// API Error Response (matches backend)
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails | ErrorDetails[];
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

// Frontend-specific error interface
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails | ErrorDetails[];
  timestamp: string;
  requestId?: string;
  statusCode?: number;
  isRetryable?: boolean;
}

// Result pattern for functional error handling
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };
