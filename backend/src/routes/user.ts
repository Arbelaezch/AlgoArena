import { Router } from 'express';

import { getProfile, updateProfile, getUserById, uploadAvatar, deleteAvatar } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { userRateLimit, apiRateLimit } from '../utils/rateLimiter.js';

const router = Router();

// ==========================================
// USER PROFILE ROUTES
// ==========================================

/**
 * Get current user's profile
 * GET /api/users/profile
 */
router.get('/profile', 
  userRateLimit, 
  requireAuth, 
  getProfile
);

/**
 * Update current user's profile
 * PATCH /api/users/profile
 */
router.patch('/profile', 
  userRateLimit, 
  requireAuth, 
  updateProfile
);

/**
 * Upload user avatar
 * POST /api/users/profile/avatar
 */
router.post('/profile/avatar',
  userRateLimit,
  requireAuth,
  uploadAvatar
);

/**
 * Delete user avatar
 * DELETE /api/users/profile/avatar
 */
router.delete('/profile/avatar',
  userRateLimit,
  requireAuth,
  deleteAvatar
);

/**
 * Get user by ID (public route with rate limiting)
 * GET /api/users/:id
 */
router.get('/:id', 
  apiRateLimit, 
  getUserById
);

export default router;