import { useState, useCallback } from 'react';

import type { AppError } from '@/types/error';
import { parseApiError } from '@/utils/errorUtils';

interface UseErrorToastReturn {
  error: AppError | null;
  showError: (error: unknown) => void;
  clearError: () => void;
}

export const useErrorToast = (): UseErrorToastReturn => {
  const [error, setError] = useState<AppError | null>(null);

  const showError = useCallback((error: unknown) => {
    const appError = parseApiError(error);
    setError(appError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    showError,
    clearError,
  };
};