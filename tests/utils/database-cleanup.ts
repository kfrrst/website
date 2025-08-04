import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Production-ready database cleanup utilities for E2E tests
 */
export class DatabaseCleanup {
  private static pool: pg.Pool;
  private static initialized = false;
  private static connectionError = false;

  static async initialize() {
    if (this.initialized) return !this.connectionError;
    
    try {
      this.pool = new pg.Pool({
        connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reprint_studios_test',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });
      
      // Test the connection
      await this.pool.query('SELECT 1');
      this.initialized = true;
      this.connectionError = false;
      return true;
    } catch (error) {
      console.warn('⚠️  Database connection failed for tests:', error.message);
      this.connectionError = true;
      this.initialized = true;
      return false;
    }
  }

  /**
   * Clean all test data created during tests
   */
  static async cleanupTestData(testPrefix: string = 'test_') {
    if (!await this.initialize() || this.connectionError) {
      console.warn('⚠️  Skipping cleanup - no database connection');
      return;
    }
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete test files first (due to foreign key constraints)
      await client.query(`
        DELETE FROM files 
        WHERE project_id IN (
          SELECT id FROM projects 
          WHERE name LIKE $1 OR client_id IN (
            SELECT id FROM users WHERE email LIKE $1 AND role = 'client'
          )
        )
      `, [`${testPrefix}%`]);

      // Delete test messages
      await client.query(`
        DELETE FROM messages 
        WHERE project_id IN (
          SELECT id FROM projects WHERE name LIKE $1
        )
      `, [`${testPrefix}%`]);

      // Delete test invoices
      await client.query(`
        DELETE FROM invoices 
        WHERE project_id IN (
          SELECT id FROM projects WHERE name LIKE $1
        )
      `, [`${testPrefix}%`]);

      // Delete test project phase tracking
      await client.query(`
        DELETE FROM project_phase_tracking 
        WHERE project_id IN (
          SELECT id FROM projects WHERE name LIKE $1
        )
      `, [`${testPrefix}%`]);

      // Delete test project phase history
      await client.query(`
        DELETE FROM project_phase_history 
        WHERE project_id IN (
          SELECT id FROM projects WHERE name LIKE $1
        )
      `, [`${testPrefix}%`]);

      // Delete test project phase action status
      await client.query(`
        DELETE FROM project_phase_action_status 
        WHERE project_id IN (
          SELECT id FROM projects WHERE name LIKE $1
        )
      `, [`${testPrefix}%`]);

      // Delete test projects
      await client.query(`
        DELETE FROM projects 
        WHERE name LIKE $1 OR client_id IN (
          SELECT id FROM users WHERE email LIKE $1 AND role = 'client'
        )
      `, [`${testPrefix}%`]);

      // Delete test users
      await client.query(`
        DELETE FROM users WHERE email LIKE $1
      `, [`${testPrefix}%`]);

      // Delete test inquiries
      await client.query(`
        DELETE FROM inquiries WHERE email LIKE $1
      `, [`${testPrefix}%`]);

      // Delete test email log entries
      await client.query(`
        DELETE FROM email_log WHERE to_email LIKE $1
      `, [`${testPrefix}%`]);

      await client.query('COMMIT');
      console.log('✅ Test data cleaned up successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error cleaning up test data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create test user with proper data structure
   */
  static async createTestUser(userData: {
    email: string;
    password: string;
    role?: string;
    active?: boolean;
  }) {
    if (!await this.initialize() || this.connectionError) {
      console.warn('⚠️  Cannot create test user - no database connection');
      // Return mock user for tests that don't require real DB
      return {
        id: Math.floor(Math.random() * 10000),
        email: userData.email,
        role: userData.role || 'client',
        active: userData.active !== false
      };
    }
    
    const client = await this.pool.connect();
    
    try {
      const { email, password, role = 'client', active = true } = userData;
      
      // Hash password using bcrypt (matching server implementation)
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES ($1, $2, 'Test', 'User', $3, $4, NOW(), NOW())
        RETURNING id, email, role, is_active as active
      `, [email, hashedPassword, role, active]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Create test client user
   */
  static async createTestClient(clientData: {
    email: string;
    password: string;
    company_name: string;
    contact_name: string;
    phone?: string;
  }) {
    if (!await this.initialize() || this.connectionError) {
      console.warn('⚠️  Cannot create test client - no database connection');
      // Return mock client for tests that don't require real DB
      return {
        id: Math.floor(Math.random() * 10000),
        email: clientData.email,
        first_name: clientData.contact_name.split(' ')[0] || 'Test',
        last_name: clientData.contact_name.split(' ')[1] || 'Client',
        company_name: clientData.company_name,
        role: 'client',
        is_active: true
      };
    }
    
    const client = await this.pool.connect();
    
    try {
      // In this schema, clients are just users with role='client'
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(clientData.password, 10);
      
      const nameParts = clientData.contact_name.split(' ');
      const firstName = nameParts[0] || 'Test';
      const lastName = nameParts.slice(1).join(' ') || 'Client';
      
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, 
          company_name, phone, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'client', $5, $6, true, NOW(), NOW())
        RETURNING *
      `, [
        clientData.email,
        hashedPassword,
        firstName,
        lastName,
        clientData.company_name,
        clientData.phone || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Create test project with phases
   */
  static async createTestProject(projectData: {
    client_id: number;
    name: string;
    description?: string;
    status?: string;
    current_phase?: number;
  }) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create project
      const projectResult = await client.query(`
        INSERT INTO projects (
          client_id, name, description, status, current_phase,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
        projectData.client_id,
        projectData.name,
        projectData.description || 'Test project description',
        projectData.status || 'active',
        projectData.current_phase || 1
      ]);
      
      const project = projectResult.rows[0];
      
      // Initialize phase tracking
      const phaseKeys = ['onboarding', 'ideation', 'design', 'review', 'production', 'payment', 'signoff', 'delivery'];
      const currentPhaseKey = phaseKeys[(projectData.current_phase || 1) - 1] || 'onboarding';
      
      // Get the phase ID for the current phase
      const phaseResult = await client.query(`
        SELECT id FROM project_phases WHERE phase_key = $1
      `, [currentPhaseKey]);
      
      if (phaseResult.rows.length > 0) {
        await client.query(`
          INSERT INTO project_phase_tracking (
            project_id, current_phase_id, current_phase_index,
            phase_started_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, NOW(), NOW(), NOW())
        `, [
          project.id,
          phaseResult.rows[0].id,
          (projectData.current_phase || 1) - 1
        ]);
      }
      
      await client.query('COMMIT');
      
      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset database to clean state
   */
  static async resetDatabase() {
    const client = await this.pool.connect();
    
    try {
      // This is a more aggressive cleanup for CI environments
      // Only use in test environments!
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('Database reset can only be run in test environment');
      }
      
      await client.query('BEGIN');
      
      // Truncate all tables in correct order
      await client.query(`
        TRUNCATE TABLE 
          email_log,
          messages,
          files,
          invoices,
          invoice_line_items,
          project_phase_action_status,
          project_phase_history,
          project_phase_tracking,
          phase_documents,
          projects,
          inquiries,
          notifications,
          user_sessions,
          users
        RESTART IDENTITY CASCADE
      `);
      
      await client.query('COMMIT');
      console.log('✅ Database reset successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error resetting database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection pool
   */
  static async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Initialize on import
DatabaseCleanup.initialize();