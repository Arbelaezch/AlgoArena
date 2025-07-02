import React, { type ReactNode } from 'react';

interface ConditionalRouteProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConditionalRoute: React.FC<ConditionalRouteProps> = ({
  condition,
  children,
  fallback = null
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};