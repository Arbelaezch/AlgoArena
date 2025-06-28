import { Router } from 'express';

import authRoutes from './auth';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);

// Future routes will be added here:
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;