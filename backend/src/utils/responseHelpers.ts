import type { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: SuccessResponse<T>['meta']
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta })
  };

  res.status(statusCode).json(response);
};

export const sendCreated = <T = unknown>(res: Response, data: T, message?: string): void => {
  sendSuccess(res, data, message || 'Resource created successfully', 201);
};

export const sendUpdated = <T = unknown>(res: Response, data: T, message?: string): void => {
  sendSuccess(res, data, message || 'Resource updated successfully', 200);
};

export const sendDeleted = (res: Response, message?: string): void => {
  sendSuccess(res, null, message || 'Resource deleted successfully', 200);
};

export const sendPaginated = <T = unknown>(
  res: Response,
  data: T[],
  pagination: Omit<PaginationMeta, 'pages'>,
  message?: string
): void => {
  const pages = Math.ceil(pagination.total / pagination.limit);
  
  sendSuccess(res, data, message, 200, {
    pagination: { ...pagination, pages }
  });
};