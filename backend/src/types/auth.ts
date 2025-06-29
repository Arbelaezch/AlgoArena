import { UserEntity } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<UserEntity, 'password_hash'>;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
}

// Future auth types might include:
// export interface ResetPasswordRequest { ... }
// export interface ChangePasswordRequest { ... }
// export interface OAuthResponse { ... }