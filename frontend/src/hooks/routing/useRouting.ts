import { useNavigate, useLocation } from 'react-router';
import { useCallback } from 'react';

interface RouteOptions {
  replace?: boolean;
  state?: any;
}

export function useRouting() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = useCallback((path: string, options?: RouteOptions) => {
    navigate(path, {
      replace: options?.replace || false,
      state: options?.state,
    });
  }, [navigate]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  const getCurrentPath = useCallback(() => {
    return location.pathname;
  }, [location.pathname]);

  const getSearchParams = useCallback(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);

  const isCurrentPath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isPathActive = useCallback((path: string) => {
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return {
    navigateTo,
    goBack,
    goForward,
    getCurrentPath,
    getSearchParams,
    isCurrentPath,
    isPathActive,
    location,
  };
}