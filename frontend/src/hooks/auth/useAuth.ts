import { useState, useEffect, createContext, useContext, useCallback, createElement } from 'react';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api';
import type { User, LoginRequest, RegisterRequest } from '@backend-types';
import { type AppError } from '@/types/error';
import { parseApiError, getUserFriendlyMessage } from '@/utils/errorUtils';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: AppError | null;
  isError: boolean;
  clearError: () => void;
  getErrorMessage: () => string;
}

// Create Auth Context with explicit initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context type for potential advanced usage
export type { AuthContextType };

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [error, setError] = useState<AppError | null>(null);

  // Creates a complete AuthState object with defaults and optional overrides.
  const createAuthState = useCallback((overrides: Partial<AuthState> = {}): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    ...overrides,
  }), []);

  // Resets auth state to default values (logged out state).
  const resetAuthState = useCallback(() => {
    setState(createAuthState());
    setError(null);
  }, [createAuthState]);

  // Sets successful authentication state with user data.
  const setAuthSuccess = useCallback((user: User) => {
    setState(createAuthState({
      user,
      isAuthenticated: true,
    }));
    setError(null);
  }, [createAuthState]);

  /**
   * Updates loading state and clears any existing errors.
   * Used at the start of async auth operations.
  */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
    if (loading) setError(null);
  }, []);

  /**
   * Sets error state and stops loading.
   * Used when auth operations fail.
  */
  const setAuthError = useCallback((error: unknown) => {
    const appError = parseApiError(error);
    setError(appError);
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  /**
   * Clears any authentication error from the state.
   * Used by UI components to dismiss error messages.
  */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Gets user-friendly error message.
   * Returns empty string if no error.
  */
  const getErrorMessage = useCallback(() => {
    if (!error) return '';
    return getUserFriendlyMessage(error);
  }, [error]);

  /**
   * Executes auth actions (login/register) with consistent error handling.
   * Handles loading states, success scenarios, and error formatting.
   * Re-throws errors so components can handle them if needed.
  */
  const executeAuthAction = useCallback(async (
    action: () => Promise<{ user: User }>,
  ): Promise<void> => {
    setLoading(true);
    
    try {
      const authData = await action();
      setAuthSuccess(authData.user);
    } catch (error: unknown) {
      setAuthError(error);
      throw error; // Re-throw so component can handle it if needed
    }
  }, [setLoading, setAuthSuccess, setAuthError]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth events (logout from token refresh failure)
  useEffect(() => {
    const handleAuthLogout = () => {
      resetAuthState();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [resetAuthState]);

  /**
   * Initializes authentication state on app startup.
   * Checks for existing valid tokens and loads user profile if authenticated.
   * Gracefully handles initialization failures without showing errors to user.
   */
  const initializeAuth = async () => {
    try {
      if (apiClient.isAuthenticated()) {
        const user = await apiClient.getProfile();
        setAuthSuccess(user);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.warn('Failed to initialize auth:', error);
      resetAuthState();
    }
  };

  /**
   * Authenticates user with email/password credentials.
   * Shows loading state, handles success/error scenarios.
   * Re-throws errors for component-level handling (e.g., form validation).
  */
  const login = useCallback(async (credentials: LoginRequest) => {
    await executeAuthAction(
      () => apiClient.login(credentials)
    );
  }, [executeAuthAction]);

  /**
   * Registers a new user account and automatically logs them in.
   * Shows loading state, handles success/error scenarios.
   * Re-throws errors for component-level handling.
   */
  const register = useCallback(async (userData: RegisterRequest) => {
    await executeAuthAction(
      () => apiClient.register(userData)
    );
  }, [executeAuthAction]);

  /**
   * Logs out the current user.
   * Attempts to notify the server, but always clears local state regardless.
   * Shows loading state during the process.
   */
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      resetAuthState();
    }
  }, [setLoading, resetAuthState]);

  /**
   * Refreshes the current user's profile data from the server.
   * Updates user data without affecting authentication status.
   * Silently fails to avoid disrupting user experience.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const user = await apiClient.getProfile();
      setState(prev => ({ ...prev, user }));
    } catch (error) {
      console.warn('Failed to refresh profile:', error);
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshProfile,
    error,
    isError: error !== null,
    clearError,
    getErrorMessage,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Additional hooks for specific auth operations
export function useLogin() {
  const { login, isLoading, error, clearError, getErrorMessage } = useAuth();
  return { login, isLoading, error, clearError, getErrorMessage };
}

export function useRegister() {
  const { register, isLoading, error, clearError, getErrorMessage } = useAuth();
  return { register, isLoading, error, clearError, getErrorMessage };
}

export function useLogout() {
  const { logout, isLoading } = useAuth();
  return { logout, isLoading };
}