#!/usr/bin/env node

/**
 * Database Schema Generator for RE Print Studios
 * Generates visual database schema documentation
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

class DatabaseSchemaGenerator {
  constructor() {
    this.tables = {};
    this.relationships = [];
  }

  async analyzeDatabase() {
    console.log('🔍 Analyzing database schema...');
    
    // Execute PostgreSQL commands to get table information
    const tables = await this.executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    for (const table of tables) {
      await this.analyzeTable(table.table_name);
    }

    await this.findRelationships();
  }

  async analyzeTable(tableName) {
    console.log(`📊 Analyzing table: ${tableName}`);
    
    const columns = await this.executeQuery(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    const constraints = await this.executeQuery(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = '${tableName}'
        AND tc.table_schema = 'public';
    `);

    this.tables[tableName] = {
      columns: columns,
      constraints: constraints,
      primaryKey: constraints.find(c => c.constraint_type === 'PRIMARY KEY')?.column_name,
      foreignKeys: constraints.filter(c => c.constraint_type === 'FOREIGN KEY')
    };
  }

  async findRelationships() {
    console.log('🔗 Mapping relationships...');
    
    for (const [tableName, tableInfo] of Object.entries(this.tables)) {
      for (const fk of tableInfo.foreignKeys) {
        this.relationships.push({
          from: tableName,
          fromColumn: fk.column_name,
          to: fk.foreign_table_name,
          toColumn: fk.foreign_column_name,
          type: 'one-to-many'
        });
      }
    }
  }

  executeQuery(query) {
    return new Promise((resolve, reject) => {
      const cmd = `psql -d reprint_studios -t -A -F'|' -c "${query.replace(/"/g, '\\"')}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        const lines = stdout.trim().split('\n').filter(line => line.length > 0);
        const result = lines.map(line => {
          const values = line.split('|');
          const obj = {};
          // This is a simplified parser - would need to be more robust for production
          if (query.includes('table_name FROM information_schema.tables')) {
            obj.table_name = values[0];
          } else if (query.includes('column_name,')) {
            obj.column_name = values[0];
            obj.data_type = values[1];
            obj.character_maximum_length = values[2];
            obj.is_nullable = values[3];
            obj.column_default = values[4];
            obj.ordinal_position = parseInt(values[5]);
          } else if (query.includes('constraint_name,')) {
            obj.constraint_name = values[0];
            obj.constraint_type = values[1];
            obj.column_name = values[2];
            obj.foreign_table_name = values[3];
            obj.foreign_column_name = values[4];
          }
          return obj;
        });
        resolve(result);
      });
    });
  }

  generateMermaidERD() {
    console.log('🎨 Generating Mermaid ERD...');
    
    let mermaid = 'erDiagram\n';
    
    // Add tables with their columns
    for (const [tableName, tableInfo] of Object.entries(this.tables)) {
      mermaid += `    ${tableName.toUpperCase()} {\n`;
      
      for (const column of tableInfo.columns.slice(0, 8)) { // Limit for readability
        const type = this.mapPostgresToMermaid(column.data_type);
        const nullable = column.is_nullable === 'YES' ? '?' : '';
        const pk = column.column_name === tableInfo.primaryKey ? ' PK' : '';
        const fk = tableInfo.foreignKeys.some(fk => fk.column_name === column.column_name) ? ' FK' : '';
        
        mermaid += `        ${type} ${column.column_name}${nullable}${pk}${fk}\n`;
      }
      
      if (tableInfo.columns.length > 8) {
        mermaid += `        string "... ${tableInfo.columns.length - 8} more columns"\n`;
      }
      
      mermaid += '    }\n';
    }
    
    // Add relationships
    for (const rel of this.relationships) {
      mermaid += `    ${rel.to.toUpperCase()} ||--o{ ${rel.from.toUpperCase()} : "has"\n`;
    }
    
    return mermaid;
  }

  mapPostgresToMermaid(pgType) {
    const typeMap = {
      'uuid': 'string',
      'character varying': 'string',
      'text': 'string',
      'boolean': 'boolean',
      'integer': 'int',
      'bigint': 'bigint',
      'numeric': 'decimal',
      'timestamp without time zone': 'datetime',
      'timestamp with time zone': 'datetime',
      'date': 'date',
      'inet': 'string',
      'jsonb': 'json'
    };
    
    return typeMap[pgType] || 'string';
  }

  generateSummaryReport() {
    console.log('📋 Generating summary report...');
    
    const totalTables = Object.keys(this.tables).length;
    const totalColumns = Object.values(this.tables).reduce((sum, table) => sum + table.columns.length, 0);
    const totalRelationships = this.relationships.length;
    
    let report = `
# 📊 Database Schema Analysis Report

## 🎯 Quick Stats
- **Total Tables:** ${totalTables}
- **Total Columns:** ${totalColumns}
- **Total Relationships:** ${totalRelationships}
- **Average Columns per Table:** ${Math.round(totalColumns / totalTables)}

## 📋 Table Summary

| Table | Columns | Primary Key | Foreign Keys | Purpose |
|-------|---------|-------------|--------------|---------|
`;

    const tablePurposes = {
      'users': 'Authentication & User Management',
      'projects': 'Main Business Entity',
      'files': 'Document & Asset Management',
      'messages': 'Project Communication',
      'user_sessions': 'Authentication Sessions',
      'activity_log': 'Audit Trail',
      'project_milestones': 'Progress Tracking',
      'automation_notifications': 'System State Tracking'
    };

    for (const [tableName, tableInfo] of Object.entries(this.tables)) {
      const fkCount = tableInfo.foreignKeys.length;
      const purpose = tablePurposes[tableName] || 'Unknown';
      
      report += `| **${tableName}** | ${tableInfo.columns.length} | ${tableInfo.primaryKey || 'N/A'} | ${fkCount} | ${purpose} |\n`;
    }

    report += `
## 🔗 Relationship Analysis

`;

    for (const rel of this.relationships) {
      report += `- **${rel.from}** references **${rel.to}** (${rel.fromColumn} → ${rel.toColumn})\n`;
    }

    return report;
  }

  async saveFiles() {
    console.log('💾 Saving generated files...');
    
    // Save Mermaid ERD
    const mermaidERD = this.generateMermaidERD();
    fs.writeFileSync('./DATABASE_ERD.mmd', mermaidERD);
    
    // Save summary report
    const summaryReport = this.generateSummaryReport();
    fs.writeFileSync('./DATABASE_SUMMARY.md', summaryReport);
    
    // Save detailed schema as JSON
    const schemaData = {
      tables: this.tables,
      relationships: this.relationships,
      generatedAt: new Date().toISOString(),
      stats: {
        tableCount: Object.keys(this.tables).length,
        relationshipCount: this.relationships.length
      }
    };
    fs.writeFileSync('./database-schema.json', JSON.stringify(schemaData, null, 2));
    
    console.log('✅ Files saved:');
    console.log('  - DATABASE_ERD.mmd (Mermaid ERD diagram)');
    console.log('  - DATABASE_SUMMARY.md (Summary report)');
    console.log('  - database-schema.json (Raw schema data)');
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Database Schema Generator...\n');
  
  const generator = new DatabaseSchemaGenerator();
  
  try {
    await generator.analyzeDatabase();
    await generator.saveFiles();
    
    console.log('\n✅ Schema analysis complete!');
    console.log('\n📖 Next steps:');
    console.log('  1. Open DATABASE_SCHEMA.md for comprehensive documentation');
    console.log('  2. Use DATABASE_ERD.mmd with Mermaid Live Editor (https://mermaid.live)');
    console.log('  3. Review DATABASE_SUMMARY.md for quick overview');
    
  } catch (error) {
    console.error('❌ Error generating schema:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}