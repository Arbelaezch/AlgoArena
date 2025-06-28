import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { connectDB } from './config/database';
import { createRedisClient } from './config/redis';
import { initializeUserCacheHandlers } from './events/userEvents';
import { requestIdMiddleware, errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/responseHelpers';
import authRoutes from './routes/auth';
import routes from './routes';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app: Application = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware (must be early)
app.use(requestIdMiddleware);

// Health check route
app.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'API is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Async function to start the server
const startServer = async (): Promise<void> => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🔄 Connecting to Redis...');
    await createRedisClient();
    
    // Initialize cache event handlers
    initializeUserCacheHandlers();
    
    // Start server after successful connections
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();