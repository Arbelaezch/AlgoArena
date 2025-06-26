import { Router } from 'express';
import { register, login, getProfile, refreshToken, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken); // New refresh endpoint

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', logout); // Can be public since it just invalidates tokens

export default router;