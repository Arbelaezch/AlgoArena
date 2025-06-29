import { AppError } from './AppError';
import { ERROR_CODES, type ErrorDetails } from '../types/error';

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', details?: ErrorDetails | ErrorDetails[]) {
    super(ERROR_CODES.ALREADY_EXISTS, message, 409, details);
  }
}