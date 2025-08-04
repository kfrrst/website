#!/usr/bin/env node

/**
 * Apply all database migrations to test database
 * Usage: node scripts/apply-migrations.js
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function applyMigrations() {
  const databaseUrl = process.env.TEST_DATABASE_URL || 
                     process.env.DATABASE_URL || 
                     'postgresql://postgres:postgres@localhost:5432/reprint_studios_test';

  console.log('🔧 Applying migrations to test database...');
  console.log(`📍 Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`📋 Found ${sqlFiles.length} migration files`);

    // Apply each migration
    for (const file of sqlFiles) {
      console.log(`\n  Applying ${file}...`);
      
      try {
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        
        // Execute the entire migration file as one statement
        // PostgreSQL can handle multiple statements in a single query
        try {
          await pool.query(sql);
        } catch (error) {
          // If that fails, fall back to statement-by-statement execution
          console.log('  Falling back to statement-by-statement execution...');
          
          // More robust SQL statement splitting
          const statements = sql
            .split(/;\s*$/m) // Split on semicolon at end of line
            .map(s => s.trim())
            .filter(s => s && !s.match(/^\s*--.*$/)); // Remove empty and comment-only statements
          
          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';'; // Re-add semicolon
            try {
              await pool.query(statement);
            } catch (stmtError) {
              console.error(`\n  Statement ${i + 1} failed:`);
              console.error(`  Statement preview: ${statement.substring(0, 100)}...`);
              console.error(`  Error: ${stmtError.message}`);
              throw stmtError;
            }
          }
        }
        
        console.log(`  ✅ ${file} applied successfully`);
      } catch (error) {
        console.error(`  ❌ Failed to apply ${file}:`, error.message);
        
        // Check if it's a "already exists" error
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Continuing despite error (object already exists)`);
        } else {
          throw error;
        }
      }
    }

    // Verify key tables exist
    console.log('\n🔍 Verifying database setup...');
    const tables = ['users', 'projects', 'files', 'invoices', 'messages'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Table '${table}' exists`);
      } else {
        console.log(`  ❌ Table '${table}' missing`);
      }
    }

    // Check for test users
    const userResult = await pool.query(`
      SELECT email FROM users 
      WHERE email IN ('kendrick@reprintstudios.com', 'client@example.com')
      ORDER BY email
    `);
    
    console.log(`\n✅ Found ${userResult.rows.length} test users:`);
    userResult.rows.forEach(row => {
      console.log(`  - ${row.email}`);
    });

    console.log('\n✅ All migrations applied successfully!');
    console.log('\nTo run tests:');
    console.log(`export TEST_DATABASE_URL="${databaseUrl}"`);
    console.log('npm test');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigrations().catch(console.error);
}

export default applyMigrations;