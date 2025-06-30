import { AppError } from './AppError.js';
import { ERROR_CODES, type ErrorDetails } from '../types/error.js';

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service error',
    originalError?: Error,
    statusCode: number = 502
  ) {
    const details: ErrorDetails = {
      service,
      originalMessage: originalError?.message,
      ...(originalError && { stack: originalError.stack })
    };

    super(ERROR_CODES.EXTERNAL_SERVICE_ERROR, message, statusCode, details, true, originalError);
  }
}