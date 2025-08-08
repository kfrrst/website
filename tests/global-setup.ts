import { FullConfig } from '@playwright/test';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reprint_studios_test';
  
  // Set default test values for required environment variables
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_e2e_tests';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test_jwt_secret_for_e2e_tests';
  }
  
  // Skip database setup if running in CI without database
  if (process.env.SKIP_DB_SETUP === 'true') {
    console.log('⚠️  Skipping database setup (SKIP_DB_SETUP=true)');
    return;
  }
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableCheck.rows[0].count === '0') {
      console.log('📋 Creating database schema...');
      
      // Read and execute schema file if it exists
      const schemaPath = path.join(__dirname, '..', 'database.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('✅ Database schema created');
      } else {
        console.log('⚠️  No database.sql file found, skipping schema creation');
      }
    } else {
      console.log('✅ Database schema already exists');
    }
    
    // Clear existing test data
    console.log('🧹 Clearing existing test data...');
    try {
      // Try to delete with proper column names
      await pool.query(`
        DELETE FROM files WHERE id IN (
          SELECT f.id FROM files f 
          JOIN projects p ON f.project_id = p.id 
          WHERE p.name LIKE 'test_%'
        )
      `);
      await pool.query(`DELETE FROM messages WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`);
      await pool.query(`DELETE FROM project_phase_tracking WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`);
      await pool.query(`DELETE FROM project_phase_history WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`);
      await pool.query(`DELETE FROM project_phase_action_status WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`);
      await pool.query(`DELETE FROM phase_documents WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`);
      await pool.query(`DELETE FROM projects WHERE name LIKE 'test_%'`);
      await pool.query(`DELETE FROM users WHERE email LIKE 'test_%' AND role = 'client'`);
    } catch (cleanupError) {
      console.log('⚠️  Some cleanup queries failed, continuing anyway:', cleanupError.message);
    }
    
    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Don't throw - let tests handle missing database gracefully
  } finally {
    await pool.end();
  }
  
  // Store the base URL for tests
  process.env.BASE_URL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
}

export default globalSetup;