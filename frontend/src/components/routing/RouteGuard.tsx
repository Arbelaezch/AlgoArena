import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

interface RouteGuardProps {
  children: ReactNode;
  condition: boolean;
  redirectTo: string;
  fallback?: ReactNode;
  preserveLocation?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  condition,
  redirectTo,
  fallback,
  preserveLocation = true
}) => {
  const location = useLocation();

  if (!condition) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Navigate
        to={redirectTo}
        state={preserveLocation ? { from: location.pathname } : undefined}
        replace
      />
    );
  }

  return <>{children}</>;
};