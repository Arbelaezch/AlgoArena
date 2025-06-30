import { AppError } from './AppError.js';
import { ERROR_CODES, type ErrorDetails } from '../types/error.js';

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: ErrorDetails | ErrorDetails[]) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }

  static fromZodError(zodError: { errors: Array<{ path: (string | number)[]; message: string; received?: unknown; code: string }> }): ValidationError {
    const details: ErrorDetails[] = zodError.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.received,
      constraint: err.code
    }));

    return new ValidationError('Validation failed', details);
  }

  static fromJoiError(joiError: { details: Array<{ path: (string | number)[]; message: string; context?: { value?: unknown }; type: string }> }): ValidationError {
    const details: ErrorDetails[] = joiError.details.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.context?.value,
      constraint: err.type
    }));

    return new ValidationError('Validation failed', details);
  }
}