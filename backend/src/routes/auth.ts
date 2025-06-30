import { Router } from 'express';

import { 
  register, 
  login, 
  getProfile, 
  refreshToken, 
  logout,
  logoutAll,
  getSessionInfo,
  updatePreferences,
  getActiveSessions,
  getFlashMessages,
  addFlashMessage,
  healthCheck
} from '../controllers/authController';
import { 
  requireAuth, 
  optionalAuth, 
  requireGuest, 
  requireRole,
  authRateLimit
} from '../middleware/authMiddleware';
import {
  loginRateLimit,
  registerRateLimit,
  refreshTokenRateLimit,
  generalRateLimit
} from '../utils/rateLimiter';

const router = Router();

// ==========================================
// CORE AUTHENTICATION ROUTES
// ==========================================

/**
 * Register new user
 */
router.post('/register', 
  registerRateLimit, 
  requireGuest, 
  register
);

/**
 * Login user
 */
router.post('/login', 
  loginRateLimit,
  requireGuest, 
  login
);

/**
 * Refresh authentication tokens/session
 */
router.post('/refresh-token', 
  refreshTokenRateLimit,
  refreshToken
);

/**
 * Get current user profile
 */
router.get('/profile', 
  generalRateLimit, 
  requireAuth, 
  getProfile
);

/**
 * Logout from current session/device
 */
router.post('/logout', 
  generalRateLimit, 
  logout
);

/**
 * Logout from all devices/sessions
 */
router.post('/logout-all', 
  generalRateLimit, 
  requireAuth, 
  logoutAll
);

// ==========================================
// SESSION MANAGEMENT ROUTES
// ==========================================

/**
 * Get detailed session information
 */
router.get('/session', 
  generalRateLimit, 
  optionalAuth, 
  getSessionInfo
);

/**
 * Update session preferences
 */
router.patch('/preferences', 
  generalRateLimit, 
  requireAuth, 
  updatePreferences
);

/**
 * Get user's active sessions
 */
router.get('/sessions/:userId', 
  generalRateLimit, 
  requireAuth, 
  getActiveSessions
);

// ==========================================
// FLASH MESSAGE ROUTES
// ==========================================

/**
 * Get flash messages
 */
router.get('/flash', 
  generalRateLimit, 
  getFlashMessages
);

/**
 * Add flash message
 */
router.post('/flash', 
  generalRateLimit, 
  requireAuth, 
  addFlashMessage
);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Health check for authentication service
 * Admin only
 */
router.get('/health', 
  generalRateLimit, 
  requireRole('admin'), 
  healthCheck
);

/**
 * Get session statistics (admin only)
 */
router.get('/stats', 
  generalRateLimit, 
  requireRole('admin'), 
  async (req, res) => {
    try {
      const { getSessionStats } = await import('../services/sessionService');
      const stats = await getSessionStats();
      res.json({
        success: true,
        data: stats,
        message: 'Session statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get session stats error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'An error occurred while fetching session statistics',
      });
    }
  }
);


export default router;