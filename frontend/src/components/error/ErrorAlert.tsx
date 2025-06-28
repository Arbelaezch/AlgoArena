import React from 'react';
import type { AppError } from '@/types/error';
import { getUserFriendlyMessage, getFieldErrors } from '@/utils/errorUtils';

interface ErrorAlertProps {
  error: AppError | null;
  onDismiss?: () => void;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  showRetry = false,
  onRetry,
  className = '',
}) => {
  if (!error) return null;

  const friendlyMessage = getUserFriendlyMessage(error);
  const fieldErrors = getFieldErrors(error);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className={`bg-red-50 border-l-4 border-red-500 p-4 rounded ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-700 font-medium">
            {friendlyMessage}
          </p>
          
          {hasFieldErrors && (
            <div className="mt-2">
              <ul className="text-sm text-red-600 space-y-1">
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>• {message}</li>
                ))}
              </ul>
            </div>
          )}

          {(showRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {showRetry && error.isRetryable && onRetry && (
                <button
                  type="button"
                  className="bg-red-100 px-3 py-1 rounded text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={onRetry}
                >
                  Try again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  className="text-red-700 text-sm font-medium hover:text-red-600 focus:outline-none"
                  onClick={onDismiss}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};