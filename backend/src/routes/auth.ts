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
} from '../controllers/authController.js';
import { 
  requireAuth,
  optionalAuth,
  requireRole,
} from '../middleware/authMiddleware.js';
import {
  authRateLimit,
  refreshTokenRateLimit,
  apiRateLimit,
  userRateLimit
} from '../utils/rateLimiter.js';

const router = Router();

// ==========================================
// CORE AUTHENTICATION ROUTES
// ==========================================

/**
 * Register new user
 */
router.post('/register', 
  authRateLimit, 
  register
);

/**
 * Login user
 */
router.post('/login', 
  authRateLimit,
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
  userRateLimit, 
  requireAuth, 
  getProfile
);

/**
 * Logout from current session/device
 */
router.post('/logout', 
  apiRateLimit, 
  logout
);

/**
 * Logout from all devices/sessions
 */
router.post('/logout-all', 
  userRateLimit, 
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
  apiRateLimit, 
  optionalAuth, 
  getSessionInfo
);

/**
 * Update session preferences
 */
router.patch('/preferences', 
  userRateLimit, 
  requireAuth, 
  updatePreferences
);

/**
 * Get user's active sessions
 */
router.get('/sessions/:userId', 
  userRateLimit, 
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
  apiRateLimit, 
  getFlashMessages
);

/**
 * Add flash message
 */
router.post('/flash', 
  userRateLimit, 
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
  apiRateLimit, 
  requireRole('admin'), 
  healthCheck
);

/**
 * Get session statistics (admin only)
 */
router.get('/stats', 
  apiRateLimit, 
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