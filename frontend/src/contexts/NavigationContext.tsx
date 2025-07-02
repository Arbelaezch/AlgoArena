import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavigationState {
  currentPath: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  navigationItems: NavigationItem[];
}

interface NavigationContextType extends NavigationState {
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path?: string }>) => void;
  navigateToTab: (tabId: string) => void;
  isActiveTab: (tabId: string) => boolean;
  getActiveTab: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  navigationItems: NavigationItem[];
}

export function NavigationProvider({ children, navigationItems }: NavigationProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [state, setState] = useState<NavigationState>({
    currentPath: location.pathname,
    breadcrumbs: [],
    navigationItems,
  });

  // Update current path when location changes
  useEffect(() => {
    setState(prev => ({ ...prev, currentPath: location.pathname }));
  }, [location.pathname]);

  // Auto-generate breadcrumbs based on current path
  useEffect(() => {
    const generateBreadcrumbs = () => {
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const breadcrumbs: Array<{ label: string; path?: string }> = [];

      // Always add dashboard home
      if (pathSegments.includes('dashboard')) {
        breadcrumbs.push({ label: 'Dashboard', path: '/dashboard' });
        
        // Find the current page based on navigation items
        const currentItem = navigationItems.find(item => 
          location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        );
        
        if (currentItem && currentItem.path !== '/dashboard') {
          breadcrumbs.push({ label: currentItem.label });
        }
      }

      return breadcrumbs;
    };

    setBreadcrumbs(generateBreadcrumbs());
  }, [location.pathname, navigationItems]);

  const setCurrentPath = useCallback((path: string) => {
    setState(prev => ({ ...prev, currentPath: path }));
  }, []);

  const setBreadcrumbs = useCallback((breadcrumbs: Array<{ label: string; path?: string }>) => {
    setState(prev => ({ ...prev, breadcrumbs }));
  }, []);

  const navigateToTab = useCallback((tabId: string) => {
    const item = navigationItems.find(nav => nav.id === tabId);
    if (item) {
      navigate(item.path);
    }
  }, [navigate, navigationItems]);

  const isActiveTab = useCallback((tabId: string) => {
    const item = navigationItems.find(nav => nav.id === tabId);
    if (!item) return false;
    
    // Exact match for dashboard home
    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    
    // Path starts with the item path (for nested routes)
    return location.pathname.startsWith(item.path);
  }, [location.pathname, navigationItems]);

  const getActiveTab = useCallback(() => {
    // Find the most specific matching tab
    const matchingItems = navigationItems.filter(item => {
      if (item.path === '/dashboard') {
        return location.pathname === '/dashboard';
      }
      return location.pathname.startsWith(item.path);
    });

    // Return the most specific match (longest path)
    const activeItem = matchingItems.reduce((longest, current) => 
      current.path.length > longest.path.length ? current : longest
    , matchingItems[0]);

    return activeItem?.id || 'dashboard';
  }, [location.pathname, navigationItems]);

  const value: NavigationContextType = {
    ...state,
    setCurrentPath,
    setBreadcrumbs,
    navigateToTab,
    isActiveTab,
    getActiveTab,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}