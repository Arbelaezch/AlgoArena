import { AppError } from './AppError';
import { ERROR_CODES, type ErrorCode } from '../types/error';

export class AuthError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.UNAUTHORIZED, message: string = 'Authentication failed') {
    const statusCode = code === ERROR_CODES.FORBIDDEN ? 403 : 401;
    super(code, message, statusCode);
  }
}