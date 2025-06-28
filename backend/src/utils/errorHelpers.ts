import { AppError } from '../errors/AppError';
import { ValidationError } from '../errors/ValidationError';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { BusinessError } from '../errors/BusinessError';
import { AuthError } from '../errors/AuthError';
import { ExternalServiceError } from '../errors/ExternalServiceError';
import { ERROR_CODES, type ErrorCode, type ErrorDetails } from '../types/error';

// Factory functions for common errors
export const createValidationError = (message?: string, details?: ErrorDetails | ErrorDetails[]): ValidationError => {
  return new ValidationError(message, details);
};

export const createNotFoundError = (resource: string, id?: string | number): NotFoundError => {
  return new NotFoundError(resource, id);
};

export const createConflictError = (message?: string, details?: ErrorDetails): ConflictError => {
  return new ConflictError(message, details);
};

export const createBusinessError = (message: string, details?: ErrorDetails): BusinessError => {
  return new BusinessError(message, ERROR_CODES.BUSINESS_RULE_VIOLATION, details);
};

export const createAuthError = (code?: ErrorCode, message?: string): AuthError => {
  return new AuthError(code, message);
};

export const createExternalServiceError = (service: string, message?: string, originalError?: Error): ExternalServiceError => {
  return new ExternalServiceError(service, message, originalError);
};

// Database error handler with proper typing
export const handleDatabaseError = (error: any): AppError => {
  if (error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyValue || {})[0];
    return new ConflictError(`${field} already exists`, { field, value: error.keyValue?.[field] });
  }
  
  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format', { field: error.path, value: error.value });
  }

  return new AppError(ERROR_CODES.DATABASE_ERROR, 'Database operation failed', 500, undefined, true, error);
};

// HTTP client error handler with cause preservation
export const handleHttpError = (error: any, service: string): ExternalServiceError => {
  if (error.response) {
    const statusCode = error.response.status >= 500 ? 502 : 400;
    return new ExternalServiceError(
      service,
      `${service} API error: ${error.response.data?.message || error.message}`,
      error,
      statusCode
    );
  }
  
  return new ExternalServiceError(service, `Network error connecting to ${service}`, error);
};