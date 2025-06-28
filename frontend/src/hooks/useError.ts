import { useState, useCallback } from 'react';
import type { AppError } from '@/types/error';
import { parseApiError, getUserFriendlyMessage } from '@/utils/errorUtils';

interface UseErrorReturn {
  error: AppError | null;
  isError: boolean;
  setError: (error: unknown) => void;
  clearError: () => void;
  getErrorMessage: () => string;
  isRetryable: boolean;
}

export const useError = (): UseErrorReturn => {
  const [error, setErrorState] = useState<AppError | null>(null);

  const setError = useCallback((error: unknown) => {
    const appError = parseApiError(error);
    setErrorState(appError);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const getErrorMessage = useCallback(() => {
    if (!error) return '';
    return getUserFriendlyMessage(error);
  }, [error]);

  return {
    error,
    isError: error !== null,
    setError,
    clearError,
    getErrorMessage,
    isRetryable: error?.isRetryable ?? false,
  };
};