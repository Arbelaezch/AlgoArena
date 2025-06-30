import { UserEntity } from './user.js';

// Global declaration to extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
      requestId?: string;
    }
  }
}

export {};