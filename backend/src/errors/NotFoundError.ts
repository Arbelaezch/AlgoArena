import { AppError } from './AppError';
import { ERROR_CODES, type ErrorDetails } from '../types/error';

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string | number) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    const details: ErrorDetails = id ? { resource, id } : { resource };
    
    super(ERROR_CODES.NOT_FOUND, message, 404, details);
  }
}