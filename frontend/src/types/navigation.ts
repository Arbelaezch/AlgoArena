import React, { createContext } from 'react';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface NavigationState {
  currentPath: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  navigationItems: NavigationItem[];
}

export interface NavigationContextType extends NavigationState {
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path?: string }>) => void;
  navigateToTab: (tabId: string) => void;
  isActiveTab: (tabId: string) => boolean;
  getActiveTab: () => string;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);