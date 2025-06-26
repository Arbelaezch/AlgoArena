import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConfig = {
  url: REDIS_URL,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
} as const;

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const createRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && isConnected) {
    return redisClient;
  }

  redisClient = createClient({
    url: redisConfig.url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  });

  // Event listeners
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis Client Ready');
    isConnected = true;
  });

  redisClient.on('end', () => {
    console.log('Redis Client Disconnected');
    isConnected = false;
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient || !isConnected) {
    throw new Error('Redis client not initialized. Call createRedisClient() first.');
  }
  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
};