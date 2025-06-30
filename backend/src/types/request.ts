import { UserEntity } from './user';

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