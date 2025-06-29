import { Router } from 'express';

import { 
  register, 
  login, 
  getProfile, 
  refreshToken, 
  logout,
  getSessionInfo,
  logoutCurrentSession
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { requireAuth, requireGuest, optionalAuth } from '../middleware/sessionMiddleware';
import { 
  loginRateLimit, 
  registerRateLimit, 
  refreshTokenRateLimit,
  generalRateLimit 
} from '../utils/rateLimiter';
import {
  destroyUserSession,
  revokeAllUserSessions,
  addFlashMessage,
  getFlashMessages,
  getSessionStats,
  getUserActiveSessions,
  updateUserSession
} from '../services/sessionService';

const router = Router();

// Apply rate limiting to auth endpoints
router.post('/register', registerRateLimit, register);

// Updated login to support both JWT and session
router.post('/login', loginRateLimit, login);

router.post('/refresh-token', refreshTokenRateLimit, refreshToken);

// Session-based routes to work alongside JWT routes
router.get('/profile', generalRateLimit, authenticateToken, getProfile);

// Logout to handle both JWT and session cleanup
router.post('/logout', generalRateLimit, logout);

// Session-specific endpoints
router.get('/session', optionalAuth, getSessionInfo);
router.post('/logout-session', requireAuth, logoutCurrentSession);

// Session-only routes
router.post('/logout-all', requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.session.user!.userId;
    
    // Revoke all sessions for this user
    await revokeAllUserSessions(userId);
    
    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during logout',
    });
  }
});

// Get current session info (different from JWT profile)
router.get('/session', optionalAuth, (req, res): void => {
  if (!req.session.user) {
    res.json({
      authenticated: false,
      sessionId: req.sessionID,
    });
    return;
  }

  res.json({
    authenticated: true,
    user: {
      id: req.session.user.userId,
      email: req.session.user.email,
      role: req.session.user.role,
      loginTime: req.session.user.loginTime,
      lastActivity: req.session.user.lastActivity,
      preferences: req.session.user.preferences,
    },
    session: {
      id: req.sessionID,
      maxAge: req.session.cookie.maxAge,
    },
  });
});

// Update session preferences
router.patch('/preferences', requireAuth, async (req, res): Promise<void> => {
  try {
    const { theme, language, timezone } = req.body;
    
    const updates: any = {};
    if (req.session.user!.preferences) {
      updates.preferences = { ...req.session.user!.preferences };
    } else {
      updates.preferences = {};
    }

    if (theme && ['light', 'dark'].includes(theme)) {
      updates.preferences.theme = theme;
    }
    if (language) {
      updates.preferences.language = language;
    }
    if (timezone) {
      updates.preferences.timezone = timezone;
    }

    await updateUserSession(req, updates);

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: updates.preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while updating preferences',
    });
  }
});

// Get user's active sessions - split into two routes for clarity
router.get('/sessions', requireAuth, async (req, res): Promise<void> => {
  try {
    const currentUserId = req.session.user!.userId;
    const sessionIds = await getUserActiveSessions(currentUserId);
    
    res.json({
      userId: currentUserId,
      activeSessions: sessionIds.length,
      sessionIds: [req.sessionID], // Only show current session to non-admins
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while fetching sessions',
    });
  }
});

// Admin route to get sessions for specific user
router.get('/sessions/:userId', requireAuth, async (req, res): Promise<void> => {
  try {
    const requestedUserId = parseInt(req.params.userId);
    const currentUserId = req.session.user!.userId;
    const isAdmin = ['admin', 'superadmin'].includes(req.session.user!.role);

    // Check if user can view these sessions
    if (requestedUserId !== currentUserId && !isAdmin) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own sessions',
      });
      return;
    }

    const sessionIds = await getUserActiveSessions(requestedUserId);
    
    res.json({
      userId: requestedUserId,
      activeSessions: sessionIds.length,
      sessionIds: isAdmin ? sessionIds : [req.sessionID], // Only show current session to non-admins
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while fetching sessions',
    });
  }
});

// Get flash messages
router.get('/flash', (req, res): void => {
  const messages = getFlashMessages(req);
  res.json(messages);
});

// Admin route for session statistics
router.get('/stats', requireAuth, async (req, res): Promise<void> => {
  try {
    // Check if user is admin
    if (!['admin', 'superadmin'].includes(req.session.user!.role)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'This resource requires admin privileges',
      });
      return;
    }

    const stats = await getSessionStats();
    res.json(stats);
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while fetching session statistics',
    });
  }
});

export default router;