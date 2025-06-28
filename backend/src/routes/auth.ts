import { Router } from 'express';

import { 
  register, 
  login, 
  getProfile, 
  refreshToken, 
  logout 
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { 
  loginRateLimit, 
  registerRateLimit, 
  refreshTokenRateLimit,
  generalRateLimit 
} from '../utils/rateLimiter';

const router = Router();

// Apply rate limiting to auth endpoints
router.post('/register', registerRateLimit, register);
router.post('/login', loginRateLimit, login);
router.post('/refresh-token', refreshTokenRateLimit, refreshToken);

// General rate limiting for other auth endpoints
router.get('/profile', generalRateLimit, authenticateToken, getProfile);
router.post('/logout', generalRateLimit, logout);

export default router;