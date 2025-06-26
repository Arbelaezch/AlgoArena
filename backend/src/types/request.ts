import { Request } from 'express';
import { User } from './user';

// Request object with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// export interface PaginatedRequest extends Request {
//   query: {
//     page?: string;
//     limit?: string;
//   }
// }
// 
// export interface FileUploadRequest extends Request {
//   file?: Express.Multer.File;
// }