import session from 'express-session';
import { RedisStore } from 'connect-redis';

import { getRedisClient } from './redis.js';
import { SessionConfig } from '../types/session.js';

// Session configuration
const sessionConfig: SessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
  ttl: parseInt(process.env.SESSION_TTL || '86400'), // 24 hours in seconds
  prefix: process.env.SESSION_PREFIX || 'sess:',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TTL || '86400') * 1000, // Convert to milliseconds
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    domain: process.env.COOKIE_DOMAIN, // undefined for localhost
  },
};

// Create Redis store instance
let redisStore: RedisStore | null = null;

export const createSessionStore = (): RedisStore => {
  if (redisStore) {
    return redisStore;
  }

  const redisClient = getRedisClient();
  
  redisStore = new RedisStore({
    client: redisClient,
    prefix: sessionConfig.prefix,
    ttl: sessionConfig.ttl,
    // Optional: Custom serializer (default is JSON)
    // serializer: {
    //   parse: JSON.parse,
    //   stringify: JSON.stringify,
    // },
    // Optional: Disable touch for performance (sessions won't auto-extend)
    // disableTouch: false,
  });

  return redisStore;
};

// Create session middleware
export const createSessionMiddleware = () => {
  const store = createSessionStore();

  return session({
    store,
    secret: sessionConfig.secret,
    resave: sessionConfig.resave,
    saveUninitialized: sessionConfig.saveUninitialized,
    rolling: sessionConfig.rolling,
    cookie: sessionConfig.cookie,
    name: 'sessionId', // Custom session cookie name
    // Optional: Custom session ID generator
    // genid: () => {
    //   return require('crypto').randomBytes(16).toString('hex');
    // },
  });
};

export { sessionConfig };