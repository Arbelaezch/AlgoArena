/**
 * Token management utility for handling JWT access and refresh tokens
 * Provides secure storage, validation, and expiry checking
 */
export class TokenManager {
    private static readonly ACCESS_TOKEN_KEY = 'accessToken';
    private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
    private static readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
  
    static getAccessToken(): string | null {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
  
    static getRefreshToken(): string | null {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
  
    static setTokens(accessToken: string, refreshToken: string): void {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  
    static clearTokens(): void {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  
    /**
     * Check if a JWT token has expired
     */
    static isTokenExpired(token: string): boolean {
      try {
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1]) {
          return true; // Invalid JWT format
        }
        
        const payload = JSON.parse(atob(parts[1]));
        return Date.now() >= payload.exp * 1000;
      } catch {
        return true;
      }
    }
  
    /**
     * Check if a JWT token is expiring soon (within the refresh buffer)
     */
    static isTokenExpiringSoon(token: string): boolean {
      try {
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1]) {
          return true; // Invalid JWT format
        }
        
        const payload = JSON.parse(atob(parts[1]));
        return Date.now() >= (payload.exp * 1000) - this.TOKEN_REFRESH_BUFFER;
      } catch {
        return true;
      }
    }
  
    /**
     * Get the expiry time of a JWT token in milliseconds
     */
    static getTokenExpiryTime(token: string): number | null {
      try {
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1]) {
          return null;
        }
        
        const payload = JSON.parse(atob(parts[1]));
        return payload.exp * 1000; // Convert to milliseconds
      } catch {
        return null;
      }
    }
  }