import type { Response } from 'express';

import type { ApiSuccessResponse, ApiErrorResponse, PaginatedResponse } from '../types/api.js';

export const sendSuccessResponse = <T = unknown>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ApiSuccessResponse<T>['meta']
): void => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: (res.req as any).id,
    message,
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
  paginatedData: PaginatedResponse<T>,
  message?: string
): void => {
  sendSuccessResponse(res, paginatedData.data, message, 200, {
    pagination: paginatedData.pagination
  });
};

export const sendErrorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any,
  path?: string
): void => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: code as any,
      message,
      timestamp: new Date().toISOString(),
      path: path || res.req.path,
      requestId: (res.req as any).id,
      ...(details && { details })
    }
  };

  res.status(statusCode).json(response);
};