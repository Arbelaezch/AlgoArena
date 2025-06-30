import { AxiosError } from "axios";

import {
  ERROR_CODES,
  type ErrorCode,
  type AppError,
  type ErrorDetails,
  // type ApiSuccessResponse,
  type ApiErrorResponse,
} from "@backend-types/index.js";

// Error creation utilities
export const createAppError = (
  code: ErrorCode,
  message: string,
  details?: ErrorDetails | ErrorDetails[],
  statusCode?: number,
  isRetryable: boolean = false
): AppError => {
  const error: AppError = {
    code,
    message,
    timestamp: new Date().toISOString(),
    isRetryable,
  };

  // Only add optional properties if they have values
  if (details !== undefined) {
    error.details = details;
  }

  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }

  return error;
};

// Common error creators
export const createNetworkError = (
  message: string = "Network connection failed"
): AppError =>
  createAppError(
    ERROR_CODES.NETWORK_ERROR,
    message,
    undefined,
    undefined,
    true
  );

export const createValidationError = (
  message: string,
  details?: ErrorDetails | ErrorDetails[]
): AppError =>
  createAppError(ERROR_CODES.VALIDATION_ERROR, message, details, 400);

export const createAuthError = (
  message: string = "Authentication failed"
): AppError =>
  createAppError(ERROR_CODES.UNAUTHORIZED, message, undefined, 401);

export const createNotFoundError = (resource: string = "Resource"): AppError =>
  createAppError(
    ERROR_CODES.NOT_FOUND,
    `${resource} not found`,
    undefined,
    404
  );

// Main error parser - converts API errors to AppError
export const parseApiError = (error: unknown): AppError => {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    // Check if it's the standard API error response (success: false)
    if (error.response?.data?.success === false) {
      const apiError: ApiErrorResponse = error.response.data;

      const appError: AppError = {
        code: apiError.error.code,
        message: apiError.error.message,
        timestamp: apiError.error.timestamp,
        statusCode: error.response.status,
        isRetryable: isRetryableError(error.response.status),
      };

      // Only add optional properties if they have values
      if (apiError.error.details !== undefined) {
        appError.details = apiError.error.details;
      }

      if (apiError.error.requestId !== undefined) {
        appError.requestId = apiError.error.requestId;
      }

      return appError;
    }

    // Handle non-API Axios errors
    if (error.code === "NETWORK_ERROR" || error.code === "ERR_NETWORK") {
      return createNetworkError(
        "Network connection failed. Please check your internet connection."
      );
    }

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return createNetworkError("Request timed out. Please try again.");
    }

    // Generic HTTP error
    const statusCode = error.response?.status;
    const message = getHttpStatusMessage(statusCode);
    const errorCode = getErrorCodeFromStatus(statusCode);

    return createAppError(
      errorCode,
      message,
      undefined,
      statusCode,
      isRetryableError(statusCode)
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return createAppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error.message || "An unexpected error occurred",
      undefined,
      undefined,
      false
    );
  }

  // Handle unknown errors
  return createAppError(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    "An unknown error occurred",
    undefined,
    undefined,
    false
  );
};

// Helper functions
const isRetryableError = (statusCode?: number): boolean => {
  if (!statusCode) return false;
  return statusCode >= 500 || statusCode === 408 || statusCode === 429;
};

const getErrorCodeFromStatus = (statusCode?: number): ErrorCode => {
  switch (statusCode) {
    case 400:
      return ERROR_CODES.INVALID_INPUT;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.ALREADY_EXISTS;
    case 422:
      return ERROR_CODES.VALIDATION_ERROR;
    case 429:
      return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    case 500:
      return ERROR_CODES.INTERNAL_SERVER_ERROR;
    case 502:
    case 503:
      return ERROR_CODES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
};

const getHttpStatusMessage = (statusCode?: number): string => {
  switch (statusCode) {
    case 400:
      return "Invalid request data provided";
    case 401:
      return "You need to log in to access this resource";
    case 403:
      return "You don't have permission to access this resource";
    case 404:
      return "The requested resource was not found";
    case 409:
      return "This resource already exists";
    case 422:
      return "The provided data is invalid";
    case 429:
      return "Too many requests. Please try again later";
    case 500:
      return "Internal server error occurred";
    case 502:
      return "Service temporarily unavailable";
    case 503:
      return "Service is currently unavailable";
    default:
      return "An unexpected error occurred";
  }
};

// User-friendly error messages
export const getUserFriendlyMessage = (error: AppError): string => {
  const friendlyMessages: Record<ErrorCode, string> = {
    [ERROR_CODES.NETWORK_ERROR]:
      "Unable to connect. Please check your internet connection and try again.",
    [ERROR_CODES.UNAUTHORIZED]: "Please log in to continue.",
    [ERROR_CODES.FORBIDDEN]:
      "You don't have permission to perform this action.",
    [ERROR_CODES.NOT_FOUND]: "The requested item could not be found.",
    [ERROR_CODES.VALIDATION_ERROR]: "Please check your input and try again.",
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]:
      "You're doing that too often. Please wait a moment and try again.",
    [ERROR_CODES.SERVICE_UNAVAILABLE]:
      "Service is temporarily unavailable. Please try again in a few minutes.",
    [ERROR_CODES.INVALID_CREDENTIALS]:
      "Invalid email or password. Please try again.",
    [ERROR_CODES.TOKEN_EXPIRED]:
      "Your session has expired. Please log in again.",
    [ERROR_CODES.ALREADY_EXISTS]: "This item already exists.",
    [ERROR_CODES.INVALID_INPUT]: "Please check your input and try again.",
    [ERROR_CODES.MISSING_REQUIRED_FIELD]: "Please fill in all required fields.",
    [ERROR_CODES.RESOURCE_CONFLICT]: "There was a conflict with your request.",
    [ERROR_CODES.BUSINESS_RULE_VIOLATION]:
      "This action violates business rules.",
    [ERROR_CODES.OPERATION_NOT_ALLOWED]: "This operation is not allowed.",
    [ERROR_CODES.INSUFFICIENT_PERMISSIONS]:
      "You don't have sufficient permissions.",
    [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: "An external service is unavailable.",
    [ERROR_CODES.DATABASE_ERROR]: "A database error occurred.",
    [ERROR_CODES.INTERNAL_SERVER_ERROR]:
      "Something went wrong on our end. Please try again.",
  };

  return friendlyMessages[error.code] || error.message;
};

// Validation helpers
export const getFieldErrors = (error: AppError): Record<string, string> => {
  if (!error.details) return {};

  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(error.details)) {
    error.details.forEach((detail) => {
      if (detail.field && typeof detail['message'] === "string") {
        fieldErrors[detail.field] = detail['message'];
      }
    });
  } else if (error.details.field && typeof error.details['message'] === "string") {
    fieldErrors[error.details.field] = error.details['message'];
  }

  return fieldErrors;
};
