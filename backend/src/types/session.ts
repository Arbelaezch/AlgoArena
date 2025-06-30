export interface UserSessionData {
  userId: number;
  email: string;
  role: string;
  loginTime: number;
  lastActivity: number;
  preferences?: {
    theme?: "light" | "dark";
    language?: string;
    timezone?: string;
  };
  permissions?: string[];
  // Add other session data as your app grows
}

// Extend Express's session interface
declare module "express-session" {
  interface SessionData {
    user?: UserSessionData;
    // Flash messages for one-time notifications
    flash?: {
      success?: string[];
      error?: string[];
      info?: string[];
      warning?: string[];
    };
    // CSRF token for forms
    csrfToken?: string;
    // Two-factor authentication
    pendingTwoFactor?: {
      userId: number;
      method: string;
      expiresAt: number;
    };
    // OAuth state for third-party logins
    oauthState?: string;
    // Shopping cart or temporary data
    tempData?: Record<string, any>;
  }
}

export interface SessionConfig {
  secret: string;
  ttl: number;
  prefix: string;
  resave: boolean;
  saveUninitialized: boolean;
  rolling: boolean;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
    sameSite: "strict" | "lax" | "none";
    domain?: string;
  };
}
