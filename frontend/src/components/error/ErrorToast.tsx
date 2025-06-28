import React, { useEffect, useState } from 'react';
import type { AppError } from '@/types/error';
import { getUserFriendlyMessage } from '@/utils/errorUtils';

interface ErrorToastProps {
  error: AppError | null;
  duration?: number;
  onDismiss?: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  duration = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [error, duration, onDismiss]);

  if (!error) return null;

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{friendlyMessage}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onDismiss?.(), 300);
            }}
            className="ml-3 text-red-200 hover:text-white focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};