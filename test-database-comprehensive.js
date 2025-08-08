#!/usr/bin/env node

/**
 * Comprehensive Database Test Script
 * Tests all tables, queries, and relationships to identify issues
 */

import { query, withTransaction } from './config/database.js';
import chalk from 'chalk';

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  section: (msg) => console.log(chalk.cyan('\n══════════════════════════════════════')),
  title: (msg) => console.log(chalk.cyan.bold(msg)),
  table: (msg) => console.log(chalk.magenta('  Table:'), msg)
};

const testResults = {
  tables: [],
  queries: [],
  relationships: [],
  issues: []
};

// ============================================================================
// 1. TEST ALL TABLES EXIST AND HAVE PROPER STRUCTURE
// ============================================================================
async function testTables() {
  log.section();
  log.title('TESTING TABLES');
  
  const expectedTables = [
    'users', 'clients', 'projects', 'invoices', 'payments', 'files', 'messages', 'notifications',
    'activity_log', 'user_sessions', 'project_phase_tracking', 'phase_automation_rules',
    'client_actions', 'project_milestones', 'file_categories', 'file_tags', 'file_tag_assignments',
    'email_templates', 'email_queue', 'invoice_items', 'time_entries', 'project_team_members',
    'message_threads', 'message_participants', 'automation_executions', 'automation_notifications',
    'system_settings', 'project_categories', 'project_types', 'project_phases', 'file_versions',
    'email_logs', 'automation_rules', 'team_members', 'team_member_skills', 'project_team',
    'team_tasks', 'team_member_assignments', 'client_contacts', 'client_feedback',
    'project_approvals', 'project_notes', 'project_resources', 'project_templates'
  ];

  for (const tableName of expectedTables) {
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableName]);
      
      if (result.rows[0].count === '1') {
        log.success(`Table '${tableName}' exists`);
        
        // Check for required columns
        const columns = await query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        testResults.tables.push({
          name: tableName,
          exists: true,
          columns: columns.rows.length
        });
      } else {
        log.error(`Table '${tableName}' DOES NOT EXIST`);
        testResults.issues.push({
          type: 'missing_table',
          table: tableName
        });
      }
    } catch (error) {
      log.error(`Error checking table '${tableName}': ${error.message}`);
      testResults.issues.push({
        type: 'table_error',
        table: tableName,
        error: error.message
      });
    }
  }
}

// ============================================================================
// 2. TEST FOREIGN KEY RELATIONSHIPS
// ============================================================================
async function testRelationships() {
  log.section();
  log.title('TESTING RELATIONSHIPS');

  const relationships = [
    { from: 'users', column: 'client_id', to: 'clients', ref: 'id' },
    { from: 'projects', column: 'client_id', to: 'clients', ref: 'id' },
    { from: 'invoices', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'invoices', column: 'client_id', to: 'clients', ref: 'id' },
    { from: 'payments', column: 'invoice_id', to: 'invoices', ref: 'id' },
    { from: 'files', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'files', column: 'uploader_id', to: 'users', ref: 'id' },
    { from: 'messages', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'messages', column: 'sender_id', to: 'users', ref: 'id' },
    { from: 'project_phase_tracking', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'client_actions', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'client_actions', column: 'phase_id', to: 'project_phase_tracking', ref: 'id' },
    { from: 'activity_log', column: 'user_id', to: 'users', ref: 'id' },
    { from: 'notifications', column: 'recipient_id', to: 'users', ref: 'id' },
    { from: 'invoice_items', column: 'invoice_id', to: 'invoices', ref: 'id' },
    { from: 'time_entries', column: 'project_id', to: 'projects', ref: 'id' },
    { from: 'time_entries', column: 'user_id', to: 'users', ref: 'id' }
  ];

  for (const rel of relationships) {
    try {
      // Check if column exists
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [rel.from, rel.column]);

      if (columnCheck.rows.length === 0) {
        log.error(`Column '${rel.from}.${rel.column}' DOES NOT EXIST`);
        testResults.issues.push({
          type: 'missing_column',
          table: rel.from,
          column: rel.column
        });
        continue;
      }

      // Check foreign key constraint
      const fkCheck = await query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND kcu.column_name = $2
      `, [rel.from, rel.column]);

      if (fkCheck.rows.length > 0) {
        const fk = fkCheck.rows[0];
        if (fk.foreign_table_name === rel.to && fk.foreign_column_name === rel.ref) {
          log.success(`FK: ${rel.from}.${rel.column} → ${rel.to}.${rel.ref}`);
        } else {
          log.warning(`FK mismatch: ${rel.from}.${rel.column} → ${fk.foreign_table_name}.${fk.foreign_column_name} (expected ${rel.to}.${rel.ref})`);
          testResults.issues.push({
            type: 'fk_mismatch',
            from: rel.from,
            column: rel.column,
            expected: `${rel.to}.${rel.ref}`,
            actual: `${fk.foreign_table_name}.${fk.foreign_column_name}`
          });
        }
      } else {
        log.warning(`No FK constraint: ${rel.from}.${rel.column} → ${rel.to}.${rel.ref}`);
      }
    } catch (error) {
      log.error(`Error checking relationship ${rel.from}.${rel.column}: ${error.message}`);
    }
  }
}

// ============================================================================
// 3. TEST CRITICAL QUERIES USED IN THE APPLICATION
// ============================================================================
async function testQueries() {
  log.section();
  log.title('TESTING CRITICAL QUERIES');

  const testQueries = [
    {
      name: 'User login query',
      sql: `SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified, last_login_at 
            FROM users WHERE email = $1`,
      params: ['client@example.com']
    },
    {
      name: 'Projects list for client',
      sql: `SELECT p.* FROM projects p 
            JOIN clients c ON p.client_id = c.id
            JOIN users u ON u.client_id = c.id 
            WHERE u.id = $1`,
      params: ['01c175d1-345a-47fd-8370-bee55250bb09']
    },
    {
      name: 'Project phase tracking',
      sql: `SELECT * FROM project_phase_tracking 
            WHERE project_id = $1 
            ORDER BY phase_number`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'Activity log for project (using entity)',
      sql: `SELECT * FROM activity_log 
            WHERE entity_type = 'project' 
            AND entity_id = $1 
            LIMIT 10`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'Files for project',
      sql: `SELECT * FROM files 
            WHERE project_id = $1 
            AND is_active = true`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'Messages for project',
      sql: `SELECT m.*, u.first_name, u.last_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.id 
            WHERE m.project_id = $1`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'Invoices with payments',
      sql: `SELECT i.*, 
                   COALESCE(SUM(p.amount), 0) as total_paid
            FROM invoices i
            LEFT JOIN payments p ON p.invoice_id = i.id
            WHERE i.project_id = $1
            GROUP BY i.id`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'Client actions for phase',
      sql: `SELECT ca.*, pt.phase_name 
            FROM client_actions ca
            JOIN project_phase_tracking pt ON ca.phase_id = pt.id
            WHERE ca.project_id = $1`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    },
    {
      name: 'User sessions check',
      sql: `SELECT * FROM user_sessions 
            WHERE user_id = $1 
            AND expires_at > NOW()`,
      params: ['01c175d1-345a-47fd-8370-bee55250bb09']
    },
    {
      name: 'Project statistics',
      sql: `SELECT 
              (SELECT COUNT(*) FROM files WHERE project_id = $1 AND is_active = true) as file_count,
              (SELECT COUNT(*) FROM messages WHERE project_id = $1) as message_count,
              (SELECT COUNT(*) FROM invoices WHERE project_id = $1) as invoice_count`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8']
    }
  ];

  for (const testQuery of testQueries) {
    try {
      const result = await query(testQuery.sql, testQuery.params);
      log.success(`Query '${testQuery.name}': ${result.rows.length} rows`);
      testResults.queries.push({
        name: testQuery.name,
        success: true,
        rows: result.rows.length
      });
    } catch (error) {
      log.error(`Query '${testQuery.name}' FAILED: ${error.message}`);
      testResults.issues.push({
        type: 'query_error',
        query: testQuery.name,
        error: error.message
      });
    }
  }
}

// ============================================================================
// 4. TEST DATA INTEGRITY
// ============================================================================
async function testDataIntegrity() {
  log.section();
  log.title('TESTING DATA INTEGRITY');

  const integrityChecks = [
    {
      name: 'Projects without clients',
      sql: `SELECT p.id, p.name 
            FROM projects p 
            LEFT JOIN clients c ON p.client_id = c.id 
            WHERE c.id IS NULL`
    },
    {
      name: 'Users without valid roles',
      sql: `SELECT id, email, role 
            FROM users 
            WHERE role NOT IN ('admin', 'client', 'team')`
    },
    {
      name: 'Orphaned files',
      sql: `SELECT f.id, f.original_name 
            FROM files f 
            LEFT JOIN projects p ON f.project_id = p.id 
            WHERE p.id IS NULL`
    },
    {
      name: 'Invalid phase numbers',
      sql: `SELECT * FROM project_phase_tracking 
            WHERE phase_number < 1 OR phase_number > 8`
    },
    {
      name: 'Duplicate phase tracking',
      sql: `SELECT project_id, phase_number, COUNT(*) 
            FROM project_phase_tracking 
            GROUP BY project_id, phase_number 
            HAVING COUNT(*) > 1`
    },
    {
      name: 'Messages without valid senders',
      sql: `SELECT m.id 
            FROM messages m 
            LEFT JOIN users u ON m.sender_id = u.id 
            WHERE u.id IS NULL`
    },
    {
      name: 'Payments without invoices',
      sql: `SELECT p.id, p.amount 
            FROM payments p 
            LEFT JOIN invoices i ON p.invoice_id = i.id 
            WHERE i.id IS NULL`
    }
  ];

  for (const check of integrityChecks) {
    try {
      const result = await query(check.sql);
      if (result.rows.length === 0) {
        log.success(`Integrity check '${check.name}': PASSED`);
      } else {
        log.warning(`Integrity check '${check.name}': ${result.rows.length} issues found`);
        testResults.issues.push({
          type: 'integrity',
          check: check.name,
          count: result.rows.length,
          data: result.rows.slice(0, 3) // First 3 examples
        });
      }
    } catch (error) {
      log.error(`Integrity check '${check.name}' ERROR: ${error.message}`);
    }
  }
}

// ============================================================================
// 5. TEST SPECIFIC PROBLEMATIC QUERIES FROM THE APPLICATION
// ============================================================================
async function testProblematicQueries() {
  log.section();
  log.title('TESTING KNOWN PROBLEMATIC QUERIES');

  const problematicQueries = [
    {
      name: 'Activity log with project_id (SHOULD FAIL)',
      sql: `SELECT * FROM activity_log WHERE project_id = $1`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8'],
      shouldFail: true
    },
    {
      name: 'Activity log with entity_id (SHOULD PASS)',
      sql: `SELECT * FROM activity_log WHERE entity_type = 'project' AND entity_id = $1`,
      params: ['aba3bf00-2c75-43cf-94db-41ebc0b2f4d8'],
      shouldFail: false
    },
    {
      name: 'Ambiguous amount in payments join',
      sql: `SELECT SUM(amount) FROM payments p JOIN invoices i ON p.invoice_id = i.id`,
      params: [],
      shouldFail: true
    },
    {
      name: 'Fixed amount in payments join',
      sql: `SELECT SUM(p.amount) FROM payments p JOIN invoices i ON p.invoice_id = i.id`,
      params: [],
      shouldFail: false
    }
  ];

  for (const testQuery of problematicQueries) {
    try {
      const result = await query(testQuery.sql, testQuery.params);
      if (testQuery.shouldFail) {
        log.error(`Query '${testQuery.name}' SHOULD HAVE FAILED but passed`);
      } else {
        log.success(`Query '${testQuery.name}' passed as expected`);
      }
    } catch (error) {
      if (testQuery.shouldFail) {
        log.success(`Query '${testQuery.name}' failed as expected: ${error.message}`);
      } else {
        log.error(`Query '${testQuery.name}' SHOULD HAVE PASSED but failed: ${error.message}`);
        testResults.issues.push({
          type: 'unexpected_failure',
          query: testQuery.name,
          error: error.message
        });
      }
    }
  }
}

// ============================================================================
// 6. GENERATE SUMMARY REPORT
// ============================================================================
function generateReport() {
  log.section();
  log.title('TEST SUMMARY REPORT');
  log.section();

  console.log('\n' + chalk.bold('Tables Tested:'), testResults.tables.length);
  console.log(chalk.bold('Queries Tested:'), testResults.queries.length);
  console.log(chalk.bold('Issues Found:'), testResults.issues.length);

  if (testResults.issues.length > 0) {
    console.log('\n' + chalk.red.bold('ISSUES TO FIX:'));
    
    const issuesByType = {};
    testResults.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log('\n' + chalk.yellow(`${type.toUpperCase().replace(/_/g, ' ')}:`));
      issues.forEach(issue => {
        if (issue.table) {
          console.log(`  - Table: ${issue.table}${issue.column ? `.${issue.column}` : ''}`);
        } else if (issue.query) {
          console.log(`  - Query: ${issue.query}`);
        } else if (issue.check) {
          console.log(`  - Check: ${issue.check} (${issue.count} issues)`);
        }
        if (issue.error) {
          console.log(`    Error: ${issue.error}`);
        }
      });
    }

    // Generate fix script
    console.log('\n' + chalk.green.bold('SUGGESTED FIXES:'));
    generateFixSuggestions();
  } else {
    console.log('\n' + chalk.green.bold('✨ All tests passed! No issues found.'));
  }
}

function generateFixSuggestions() {
  const fixes = [];
  
  testResults.issues.forEach(issue => {
    if (issue.type === 'missing_table') {
      fixes.push(`-- Create missing table: ${issue.table}`);
      fixes.push(`CREATE TABLE IF NOT EXISTS ${issue.table} (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());`);
    } else if (issue.type === 'missing_column') {
      fixes.push(`-- Add missing column: ${issue.table}.${issue.column}`);
      fixes.push(`ALTER TABLE ${issue.table} ADD COLUMN IF NOT EXISTS ${issue.column} UUID;`);
    } else if (issue.type === 'fk_mismatch') {
      fixes.push(`-- Fix foreign key: ${issue.from}.${issue.column}`);
      fixes.push(`ALTER TABLE ${issue.from} DROP CONSTRAINT IF EXISTS ${issue.from}_${issue.column}_fkey;`);
      fixes.push(`ALTER TABLE ${issue.from} ADD CONSTRAINT ${issue.from}_${issue.column}_fkey FOREIGN KEY (${issue.column}) REFERENCES ${issue.expected.split('.')[0]}(${issue.expected.split('.')[1]});`);
    }
  });

  if (fixes.length > 0) {
    console.log('\nSQL Fixes to run:');
    fixes.forEach(fix => console.log(chalk.cyan(fix)));
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║  COMPREHENSIVE DATABASE TEST SUITE     ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════╝'));

  try {
    await testTables();
    await testRelationships();
    await testQueries();
    await testDataIntegrity();
    await testProblematicQueries();
    generateReport();
  } catch (error) {
    console.error(chalk.red('\nFatal error:'), error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
main();