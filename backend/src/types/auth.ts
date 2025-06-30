import { UserEntity } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  user: UserEntity;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  session: {
    sessionId: string;
    expiresAt: Date;
  };
  metadata: {
    loginTime: number;
    expiresAt: Date;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

// Type guards for auth responses
export const hasTokens = (response: AuthResponse): boolean => {
  return !!(response.tokens?.accessToken && response.tokens?.refreshToken);
};

export const hasSession = (response: AuthResponse): boolean => {
  return !!response.session?.sessionId;
};

export const isValidAuthResponse = (response: AuthResponse): boolean => {
  return hasTokens(response) && hasSession(response) && !!response.user;
};