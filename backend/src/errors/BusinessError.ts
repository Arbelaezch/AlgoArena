import { AppError } from './AppError';
import { ERROR_CODES, type ErrorCode, type ErrorDetails } from '../types/error';

export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.BUSINESS_RULE_VIOLATION,
    details?: ErrorDetails
  ) {
    super(code, message, 400, details);
  }
}