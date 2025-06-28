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

export const sendSuccessResponse = <T = unknown>(
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

export const sendCreatedResponse = <T = unknown>(res: Response, data: T, message?: string): void => {
  sendSuccessResponse(res, data, message || 'Resource created successfully', 201);
};

export const sendUpdatedResponse = <T = unknown>(res: Response, data: T, message?: string): void => {
  sendSuccessResponse(res, data, message || 'Resource updated successfully', 200);
};

export const sendDeletedResponse = (res: Response, message?: string): void => {
  sendSuccessResponse(res, null, message || 'Resource deleted successfully', 200);
};

export const sendPaginatedResponse = <T = unknown>(
  res: Response,
  data: T[],
  pagination: Omit<PaginationMeta, 'pages'>,
  message?: string
): void => {
  const pages = Math.ceil(pagination.total / pagination.limit);
  
  sendSuccessResponse(res, data, message, 200, {
    pagination: { ...pagination, pages }
  });
};