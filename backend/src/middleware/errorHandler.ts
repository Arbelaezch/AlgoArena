import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../errors/AppError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { ERROR_CODES } from '../types/error.js';
import { sendError } from '../utils/responseHelpers.js';

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced request interface
interface RequestWithId extends Request {
  id?: string;
}

// Request ID middleware
export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction): void => {
  req.id = (req.headers['x-request-id'] as string) || generateRequestId();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Error normalization utility - modern practice for handling unknown catch values
const ensureError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String(error.message));
  }
  
  return new Error('Unknown error occurred');
};

// Main error handler middleware
export const errorHandler = (
  error: unknown,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  const normalizedError = ensureError(error);

  const errorCause = (normalizedError as any).cause;
  
  // Log error for debugging
  console.error('Error occurred:', {
    message: normalizedError.message,
    stack: normalizedError.stack,
    url: req.url,
    method: req.method,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(errorCause ? { cause: errorCause } : {})
  });

  let appError: AppError;

  // Convert known errors to AppError
  if (normalizedError instanceof AppError) {
    appError = normalizedError;
  } else if (normalizedError.name === 'ValidationError') {
    appError = new ValidationError(normalizedError.message);
  } else if (normalizedError.name === 'CastError') {
    appError = new AppError(ERROR_CODES.INVALID_INPUT, 'Invalid ID format', 400);
  } else if (normalizedError.name === 'MongoServerError' && 'code' in normalizedError && normalizedError.code === 11000) {
    appError = new AppError(ERROR_CODES.ALREADY_EXISTS, 'Resource already exists', 409);
  } else if (normalizedError.name === 'JsonWebTokenError') {
    appError = new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
  } else if (normalizedError.name === 'TokenExpiredError') {
    appError = new AppError(ERROR_CODES.TOKEN_EXPIRED, 'Token expired', 401);
  } else {
    // Unknown error - treat as internal server error
    appError = new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'production' ? 'Internal server error' : normalizedError.message,
      500,
      undefined,
      false,
      normalizedError
    );
  }

  // Send standardized error response using your existing helper
  const includeDetails = appError.details && (process.env.NODE_ENV !== 'production' || appError.isOperational);
  
  sendError(
    res,
    appError.code,
    appError.message,
    appError.statusCode,
    includeDetails ? appError.details : undefined,
    req.path
  );
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    ERROR_CODES.NOT_FOUND,
    `Route ${req.originalUrl} not found`,
    404
  );
  next(error);
};

// Async error wrapper with proper typing
export const asyncHandler = <T extends any[]>(
  fn: (req: Request, res: Response, next: NextFunction, ...args: T) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction, ...args: T) => {
    Promise.resolve(fn(req, res, next, ...args)).catch(next);
  };
};