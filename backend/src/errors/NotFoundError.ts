import { AppError } from './AppError.js';
import { ERROR_CODES, type ErrorDetails } from '../types/error.js';

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string | number) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    const details: ErrorDetails = id ? { resource, id } : { resource };
    
    super(ERROR_CODES.NOT_FOUND, message, 404, details);
  }
}