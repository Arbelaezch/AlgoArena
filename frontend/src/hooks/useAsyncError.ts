import { useState, useCallback } from 'react';
import type { AppError } from '@/types/error';
import { parseApiError } from '@/utils/errorUtils';

interface UseAsyncErrorReturn<T> {
  data: T | null;
  error: AppError | null;
  isLoading: boolean;
  isError: boolean;
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  clearError: () => void;
}

export const useAsyncError = <T>(): UseAsyncErrorReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAsyncFn, setLastAsyncFn] = useState<(() => Promise<T>) | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    setLastAsyncFn(() => asyncFn);

    try {
      const result = await asyncFn();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      const appError = parseApiError(err);
      setError(appError);
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastAsyncFn) return null;
    return execute(lastAsyncFn);
  }, [execute, lastAsyncFn]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    execute,
    retry,
    clearError,
  };
};