import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database configuration interface
interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

// Database configuration
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'algo_arena_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // PostgreSQL pool configuration
  max: 20,                    // Maximum connections in pool
  min: 5,                     // Minimum connections in pool  
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 60000, // Max time to get connection (60 seconds)
};

// Create connection pool
export const pool: Pool = new Pool(dbConfig);

// Test database connection
export const connectDB = async (): Promise<void> => {
  try {
    const client: PoolClient = await pool.connect();
    console.log('✅ Database connected successfully');
    console.log(`📊 Connected to: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Helper function for transactions
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Helper function for simple queries
export const query = async (
  text: string, 
  params?: any[]
): Promise<QueryResult> => {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`🐌 Slow query (${duration}ms):`, text);
    }
    
    return result;
  } finally {
    client.release();
  }
};

// Helper for single row queries
export const queryOne = async <T>(
  text: string, 
  params?: any[]
): Promise<T | null> => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Helper for multiple row queries
export const queryMany = async <T>(
  text: string, 
  params?: any[]
): Promise<T[]> => {
  const result = await query(text, params);
  return result.rows;
};

// Helper for checking if query returned rows
export const queryExists = async (
  text: string, 
  params?: any[]
): Promise<boolean> => {
  const result = await query(text, params);
  return result.rows.length > 0;
};

// Pool event listeners for monitoring
pool.on('connect', (client: PoolClient) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 New database connection established');
  }
});

pool.on('error', (err: Error) => {
  console.error('❌ Database pool error:', err);
});

pool.on('remove', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔌 Database connection removed from pool');
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`🔄 Received ${signal}. Closing database connections...`);
  try {
    await pool.end();
    console.log('✅ Database connections closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await gracefulShutdown('unhandledRejection');
});

export default pool;