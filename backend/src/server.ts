import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/database.js';
import { createRedisClient } from './config/redis.js';
import { createSessionMiddleware } from './config/session.js';
import { initializeUserCacheHandlers } from './events/userEvents.js';
import { requestIdMiddleware, errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { optionalAuth } from './middleware/authMiddleware.js';
import { sendSuccessResponse } from './utils/responseHelpers.js';
import { authService } from './services/authService.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import routes from './routes/index.js';
import './types/request.js';
import './types/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // ROOT ROUTE - Welcome message for API
    app.get('/', (req, res): void => {
      sendSuccessResponse(res, {
        message: 'Welcome to AlgoArena API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api',
          auth: '/api/auth',
          docs: '/health' // Until you add proper API docs
        },
        timestamp: new Date().toISOString()
      });
    });
    
    // API ROUTES (where business logic happens)
    app.get('/health', async (req, res): Promise<void> => {
      const authHealth = await authService.healthCheck();
      
      sendSuccessResponse(res, {
        status: 'API is running successfully!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        auth: {
          authenticated: !!req.user,
          sessionId: req.sessionID,
          hasJWT: !!req.user,
          hasSession: !!req.session.user,
          authHealth
        }
      });
    });

    // Authentication routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    
    // Other API routes
    app.use('/api', routes);
    
    // Example protected route using simplified middleware
    app.get('/api/protected', async (req, res): Promise<void> => {
      const user = await authService.verify(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      sendSuccessResponse(res, {
        message: 'This is a protected route',
        user: user,
        sessionId: req.sessionID,
        hasJWT: !!req.user,
        hasSession: !!req.session.user,
      });
    });

    // Example admin route
    app.get('/api/admin', async (req, res): Promise<void> => {
      const user = await authService.verify(req);
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      if (!['admin', 'superadmin'].includes(user.role)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      
      sendSuccessResponse(res, {
        message: 'This is an admin-only route',
        user: user,
        adminLevel: user.role,
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
      console.log(`🔐 Unified authentication enabled (JWT + Sessions)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();