import { useState, useEffect, createContext, useContext, createElement } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../../lib/api'; 
import { apiClient } from '../../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
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
    error: null,
  });

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth events (logout from token refresh failure)
  useEffect(() => {
    const handleAuthLogout = () => {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const initializeAuth = async () => {
    try {
      if (apiClient.isAuthenticated()) {
        const user = await apiClient.getProfile();
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.log('Failed to initialize auth:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // Don't show error on initial load failure
      });
    }
  };

  const login = async (credentials: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authData = await apiClient.login(credentials);
      setState({
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error; // Re-throw so component can handle it if needed
    }
  };

  const register = async (userData: RegisterRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authData = await apiClient.register(userData);
      setState({
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error; // Re-throw so component can handle it if needed
    }
  };

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const refreshProfile = async () => {
    try {
      const user = await apiClient.getProfile();
      setState(prev => ({ ...prev, user }));
    } catch (error) {
      console.warn('Failed to refresh profile:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshProfile,
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
  const { login, isLoading, error } = useAuth();
  return { login, isLoading, error };
}

export function useRegister() {
  const { register, isLoading, error } = useAuth();
  return { register, isLoading, error };
}

export function useLogout() {
  const { logout, isLoading } = useAuth();
  return { logout, isLoading };
}