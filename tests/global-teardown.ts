import { FullConfig } from '@playwright/test';
import { Pool } from 'pg';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');
  
  // Skip cleanup if no database
  if (process.env.SKIP_DB_SETUP === 'true') {
    return;
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reprint_studios_test',
  });
  
  try {
    // Clean up any remaining test data - handle errors gracefully
    const cleanupQueries = [
      `DELETE FROM files WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM messages WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM project_phase_action_status WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM project_phase_history WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM project_phase_tracking WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM phase_documents WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'test_%')`,
      `DELETE FROM projects WHERE name LIKE 'test_%'`,
      `DELETE FROM users WHERE email LIKE 'test_%' AND role = 'client'`
    ];
    
    for (const query of cleanupQueries) {
      try {
        await pool.query(query);
      } catch (error) {
        // Ignore errors for missing tables/columns
        console.log(`⚠️  Cleanup query failed (continuing): ${error.message}`);
      }
    }
    
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.error('⚠️  Cleanup error:', error);
    // Don't throw - cleanup errors shouldn't fail the test run
  } finally {
    await pool.end();
  }
}

export default globalTeardown;