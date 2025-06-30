import type { ErrorCode, ErrorDetails } from '../types/error.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails | ErrorDetails[];
  public readonly isOperational: boolean;
  public readonly cause?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: ErrorDetails | ErrorDetails[],
    isOperational: boolean = true,
    cause?: Error
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    if (cause) {
      this.cause = cause;
    }

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}