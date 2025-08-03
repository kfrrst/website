import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * PostgreSQL Database Configuration
 * Creates and exports a connection pool for the Kendrick Forrest Client Portal
 */

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'kendrick_portal_dev',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  
  // SSL settings (disable for local development)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('📅 Database time:', result.rows[0].current_time);
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
};

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Query executed:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (err) {
    console.error('💥 Query error:', { text, error: err.message });
    throw err;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

// Helper function to begin a transaction
const beginTransaction = async () => {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
};

// Helper function to commit a transaction
const commitTransaction = async (client) => {
  await client.query('COMMIT');
  client.release();
};

// Helper function to rollback a transaction
const rollbackTransaction = async (client) => {
  await client.query('ROLLBACK');
  client.release();
};

// Close the pool (useful for testing or graceful shutdown)
const closePool = async () => {
  await pool.end();
  console.log('📴 Database pool closed');
};

export {
  pool,
  query,
  getClient,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  testConnection,
  closePool
};

export default pool;