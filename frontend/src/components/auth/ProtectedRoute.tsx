import React from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useAuth } from '@/hooks/auth/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/auth',
  fallback 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to dashboard after login
    const shouldPreserveLocation = location.pathname.startsWith('/dashboard');
    const from = shouldPreserveLocation ? location.pathname : '/dashboard';
    
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from }} 
        replace 
      />
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;