import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { connectDB } from './config/database';
import { createRedisClient } from './config/redis';
import { createSessionMiddleware } from './config/session';
import { initializeUserCacheHandlers } from './events/userEvents';
import { requestIdMiddleware, errorHandler, notFoundHandler } from './middleware/errorHandler';
import { optionalAuth } from './middleware/sessionMiddleware';
import { sendSuccessResponse } from './utils/responseHelpers';
import authRoutes from './routes/auth';
import routes from './routes';
import './types/request';
import './types/session';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app: Application = express();
const port = process.env.PORT || 5000;

// SECURITY & SETUP MIDDLEWARE
app.use(helmet());                                // Enable security headers
app.use(cors({                                    // Enable CORS for frontend  
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));                      // Log requests to console
app.use(express.json({ limit: '10mb' }));         // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// REQUEST ID MIDDLEWARE
app.use(requestIdMiddleware); // Add unique ID to each request

// Async function to start the server
const startServer = async (): Promise<void> => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    console.log('🔄 Connecting to Redis...');
    await createRedisClient();
    
    // Initialize session middleware after Redis is connected
    console.log('🔄 Initializing session middleware...');
    const sessionMiddleware = createSessionMiddleware();
    app.use(sessionMiddleware);
    
    // Add optional auth middleware to all routes (adds user to req if logged in)
    app.use(optionalAuth);
    
    // Initialize cache event handlers
    initializeUserCacheHandlers();
    
    // API ROUTES (where business logic happens)
    app.get('/health', (req, res): void => {
      sendSuccessResponse(res, {
        status: 'API is running successfully!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        session: !!req.session.user,
        sessionId: req.sessionID
      });
    });

    app.use('/api/auth', authRoutes);
    
    // Example protected route
    app.get('/api/protected', (req, res): void => {
      if (!req.session.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      sendSuccessResponse(res, {
        message: 'This is a protected route',
        user: req.session.user,
        sessionId: req.sessionID,
      });
    });

    // ERROR HANDLING MIDDLEWARE
    app.use(notFoundHandler);  // Catches requests that didn't match any routes
    app.use(errorHandler);     // Catches all errors from above middleware
    
    // Start server after successful connections
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 Session management enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();