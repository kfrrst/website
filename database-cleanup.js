#!/usr/bin/env node

/**
 * Database Cleanup Analyzer for RE Print Studios
 * Identifies tables that can be safely removed and optimizations
 */

import { exec } from 'child_process';

class DatabaseCleanup {
  constructor() {
    this.currentTables = [];
    this.tableUsage = {};
    this.recommendations = {
      keep: [],
      canDelete: [],
      optimize: [],
      missing: []
    };
  }

  async analyze() {
    console.log('🔍 Analyzing database for cleanup opportunities...\n');
    
    await this.getCurrentTables();
    await this.analyzeTableUsage();
    await this.checkMissingTables();
    this.generateRecommendations();
    this.displayResults();
  }

  async getCurrentTables() {
    const tables = await this.executeQuery(`
      SELECT 
        schemaname, 
        tablename, 
        tableowner,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    this.currentTables = tables;
  }

  async analyzeTableUsage() {
    console.log('📊 Analyzing table usage patterns...\n');
    
    for (const table of this.currentTables) {
      const tableName = table.tablename;
      
      // Get row count
      const rowCount = await this.executeQuery(`SELECT COUNT(*) as count FROM ${tableName};`);
      
      // Get column info
      const columns = await this.executeQuery(`
        SELECT COUNT(*) as column_count
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public';
      `);

      // Check for foreign key references TO this table
      const referencedBy = await this.executeQuery(`
        SELECT COUNT(*) as ref_count
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = '${tableName}';
      `);

      // Check for foreign keys FROM this table
      const references = await this.executeQuery(`
        SELECT COUNT(*) as fk_count
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = '${tableName}';
      `);

      this.tableUsage[tableName] = {
        rowCount: parseInt(rowCount[0]?.count || '0'),
        columnCount: parseInt(columns[0]?.column_count || '0'),
        referencedBy: parseInt(referencedBy[0]?.ref_count || '0'),
        references: parseInt(references[0]?.fk_count || '0'),
        size: table.size
      };
    }
  }

  async checkMissingTables() {
    console.log('🔍 Checking for missing critical tables...\n');
    
    const expectedTables = [
      'invoices',
      'phase_automation_rules', 
      'project_phase_tracking',
      'clients', // Separate from users
      'email_templates',
      'notifications'
    ];

    const existingTableNames = this.currentTables.map(t => t.tablename);
    
    for (const expectedTable of expectedTables) {
      if (!existingTableNames.includes(expectedTable)) {
        this.recommendations.missing.push({
          table: expectedTable,
          reason: this.getMissingTableReason(expectedTable),
          priority: this.getMissingTablePriority(expectedTable)
        });
      }
    }
  }

  getMissingTableReason(tableName) {
    const reasons = {
      'invoices': 'Required for billing and payment tracking',
      'phase_automation_rules': 'Referenced in automation service but missing',
      'project_phase_tracking': 'Referenced in phase automation but missing',
      'clients': 'Separate client entity would improve data organization',
      'email_templates': 'Email system needs template management',
      'notifications': 'User notification system missing'
    };
    return reasons[tableName] || 'Unknown reason';
  }

  getMissingTablePriority(tableName) {
    const priorities = {
      'phase_automation_rules': 'HIGH',
      'project_phase_tracking': 'HIGH', 
      'invoices': 'MEDIUM',
      'clients': 'LOW',
      'email_templates': 'LOW',
      'notifications': 'LOW'
    };
    return priorities[tableName] || 'LOW';
  }

  generateRecommendations() {
    console.log('🎯 Generating recommendations...\n');
    
    for (const [tableName, usage] of Object.entries(this.tableUsage)) {
      const recommendation = this.analyzeTable(tableName, usage);
      
      if (recommendation.action === 'keep') {
        this.recommendations.keep.push(recommendation);
      } else if (recommendation.action === 'delete') {
        this.recommendations.canDelete.push(recommendation);
      } else if (recommendation.action === 'optimize') {
        this.recommendations.optimize.push(recommendation);
      }
    }
  }

  analyzeTable(tableName, usage) {
    const criticalTables = [
      'users', 'projects', 'files', 'messages', 
      'user_sessions', 'activity_log', 'project_milestones'
    ];
    
    if (criticalTables.includes(tableName)) {
      return {
        table: tableName,
        action: 'keep',
        reason: 'Critical business table',
        usage: usage
      };
    }
    
    if (tableName === 'automation_notifications') {
      if (usage.rowCount === 0) {
        return {
          table: tableName,
          action: 'delete',
          reason: 'System utility table with no data - can be recreated',
          usage: usage
        };
      } else {
        return {
          table: tableName,
          action: 'optimize',
          reason: 'Utility table - consider cleanup of old entries',
          usage: usage
        };
      }
    }
    
    if (usage.rowCount === 0 && usage.referencedBy === 0) {
      return {
        table: tableName,
        action: 'delete',
        reason: 'Empty table with no foreign key references',
        usage: usage
      };
    }
    
    return {
      table: tableName,
      action: 'keep',
      reason: 'Has data or references',
      usage: usage
    };
  }

  displayResults() {
    console.log('═'.repeat(80));
    console.log('📋 DATABASE CLEANUP ANALYSIS REPORT');
    console.log('═'.repeat(80));
    
    console.log('\n🟢 TABLES TO KEEP (Critical):');
    console.log('─'.repeat(50));
    for (const rec of this.recommendations.keep) {
      console.log(`✅ ${rec.table.padEnd(25)} - ${rec.reason}`);
      console.log(`   📊 ${rec.usage.rowCount} rows, ${rec.usage.columnCount} columns, ${rec.usage.size}\n`);
    }
    
    if (this.recommendations.canDelete.length > 0) {
      console.log('\n🔴 TABLES SAFE TO DELETE:');
      console.log('─'.repeat(50));
      for (const rec of this.recommendations.canDelete) {
        console.log(`❌ ${rec.table.padEnd(25)} - ${rec.reason}`);
        console.log(`   📊 ${rec.usage.rowCount} rows, ${rec.usage.columnCount} columns, ${rec.usage.size}\n`);
      }
    } else {
      console.log('\n🔴 TABLES SAFE TO DELETE: None found - all tables appear to be in use.');
    }
    
    if (this.recommendations.optimize.length > 0) {
      console.log('\n🟡 TABLES TO OPTIMIZE:');
      console.log('─'.repeat(50));
      for (const rec of this.recommendations.optimize) {
        console.log(`⚠️  ${rec.table.padEnd(25)} - ${rec.reason}`);
        console.log(`   📊 ${rec.usage.rowCount} rows, ${rec.usage.columnCount} columns, ${rec.usage.size}\n`);
      }
    }
    
    if (this.recommendations.missing.length > 0) {
      console.log('\n🔵 MISSING TABLES (Recommended to add):');
      console.log('─'.repeat(50));
      for (const rec of this.recommendations.missing) {
        const priority = rec.priority === 'HIGH' ? '🔥' : rec.priority === 'MEDIUM' ? '⚡' : '📝';
        console.log(`${priority} ${rec.table.padEnd(25)} - ${rec.reason} (${rec.priority})`);
      }
      console.log('');
    }
    
    console.log('═'.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`✅ Keep: ${this.recommendations.keep.length} tables`);
    console.log(`❌ Can Delete: ${this.recommendations.canDelete.length} tables`);
    console.log(`⚠️  Optimize: ${this.recommendations.optimize.length} tables`);
    console.log(`🔵 Missing: ${this.recommendations.missing.length} tables`);
    console.log('═'.repeat(80));

    this.generateCleanupScript();
  }

  generateCleanupScript() {
    console.log('\n🛠️ GENERATED CLEANUP SCRIPT:');
    console.log('─'.repeat(50));
    
    let script = '-- Database Cleanup Script\n-- Generated: ' + new Date().toISOString() + '\n\n';
    
    if (this.recommendations.canDelete.length > 0) {
      script += '-- Tables safe to delete:\n';
      for (const rec of this.recommendations.canDelete) {
        script += `-- DROP TABLE IF EXISTS ${rec.table}; -- ${rec.reason}\n`;
      }
      script += '\n';
    }
    
    if (this.recommendations.missing.length > 0) {
      script += '-- Recommended tables to create:\n\n';
      for (const rec of this.recommendations.missing) {
        script += `-- CREATE TABLE ${rec.table} (...); -- ${rec.reason}\n`;
      }
      script += '\n';
    }
    
    if (this.recommendations.optimize.length > 0) {
      script += '-- Tables to optimize:\n';
      for (const rec of this.recommendations.optimize) {
        if (rec.table === 'automation_notifications') {
          script += `-- DELETE FROM ${rec.table} WHERE created_at < NOW() - INTERVAL '30 days';\n`;
        }
        script += `-- VACUUM ANALYZE ${rec.table};\n`;
      }
    }
    
    console.log(script);
    
    // Save to file
    require('fs').writeFileSync('./database-cleanup.sql', script);
    console.log('💾 Cleanup script saved to: database-cleanup.sql');
  }

  executeQuery(query) {
    return new Promise((resolve, reject) => {
      const cmd = `psql -d reprint_studios -t -A -F'|' -c "${query.replace(/"/g, '\\"')}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          resolve([]); // Return empty array on error instead of failing
          return;
        }
        
        const lines = stdout.trim().split('\n').filter(line => line.length > 0);
        const result = lines.map(line => {
          const values = line.split('|');
          const obj = {};
          
          if (query.includes('pg_tables')) {
            obj.schemaname = values[0];
            obj.tablename = values[1];
            obj.tableowner = values[2];
            obj.size = values[3];
          } else if (query.includes('COUNT(*) as count')) {
            obj.count = values[0];
          } else if (query.includes('COUNT(*) as column_count')) {
            obj.column_count = values[0];
          } else if (query.includes('COUNT(*) as ref_count')) {
            obj.ref_count = values[0];
          } else if (query.includes('COUNT(*) as fk_count')) {
            obj.fk_count = values[0];
          }
          
          return obj;
        });
        resolve(result);
      });
    });
  }
}

// Main execution
async function main() {
  const cleanup = new DatabaseCleanup();
  await cleanup.analyze();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}