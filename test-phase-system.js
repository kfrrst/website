#!/usr/bin/env node

/**
 * Comprehensive Phase System Diagnostic Tool
 * Tests all endpoints, database, and integration points
 */

import fetch from 'node-fetch';
import { query } from './config/database.js';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'kf_secret_jwt_2025_change_this_in_production';

// Test results collector
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper to generate test token
function generateTestToken(userId = 'b91d8a30-3c1d-4c89-b2f9-a8e5c2f7d4e9', role = 'admin') {
  return jwt.sign(
    { userId, email: 'admin@reprintstudios.com', role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Test wrapper
async function test(name, fn) {
  try {
    console.log(chalk.blue(`\nTesting: ${name}...`));
    await fn();
    results.passed.push(name);
    console.log(chalk.green(`✓ ${name}`));
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(chalk.red(`✗ ${name}`));
    console.log(chalk.red(`  Error: ${error.message}`));
  }
}

// Database Tests
async function testDatabase() {
  await test('Database Connection', async () => {
    const result = await query('SELECT NOW()');
    if (!result.rows.length) throw new Error('No response from database');
  });

  await test('Project Phases Table', async () => {
    const result = await query('SELECT COUNT(*) FROM project_phases');
    const count = parseInt(result.rows[0].count);
    if (count !== 8) throw new Error(`Expected 8 phases, found ${count}`);
  });

  await test('Phase Client Actions', async () => {
    const result = await query('SELECT COUNT(*) FROM phase_client_actions');
    const count = parseInt(result.rows[0].count);
    if (count === 0) throw new Error('No client actions found');
  });

  await test('Sample Project with Phase Tracking', async () => {
    const result = await query(`
      SELECT p.id, p.name, pt.current_phase_id, pt.current_phase_index
      FROM projects p
      LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
      WHERE p.is_active = true
      LIMIT 1
    `);
    if (result.rows.length === 0) throw new Error('No active projects found');
    const project = result.rows[0];
    if (!project.current_phase_id) {
      results.warnings.push(`Project ${project.name} has no phase tracking initialized`);
    }
  });
}

// API Endpoint Tests
async function testEndpoints() {
  const token = generateTestToken();
  
  // Test auth endpoint
  await test('Auth Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
  });

  // Get a test project
  let testProjectId;
  await test('Get Test Project', async () => {
    const result = await query('SELECT id FROM projects WHERE is_active = true LIMIT 1');
    if (result.rows.length === 0) throw new Error('No active projects in database');
    testProjectId = result.rows[0].id;
  });

  // Test project details endpoint
  await test('Project Details Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/projects/${testProjectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (!data.project) throw new Error('Response missing project data');
  });

  // Test phase tracking endpoint
  await test('Phase Tracking Endpoint (/api/phases/project/:id/tracking)', async () => {
    const response = await fetch(`${BASE_URL}/api/phases/project/${testProjectId}/tracking`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const contentType = response.headers.get('content-type');
    console.log(`  Response: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${contentType}`);
    
    if (!response.ok) {
      const body = await response.text();
      console.log(`  Body preview: ${body.substring(0, 200)}...`);
      throw new Error(`Status ${response.status}, Content-Type: ${contentType}`);
    }
    
    const data = await response.json();
    if (!data.tracking) throw new Error('Response missing tracking data');
    if (!data.actions) throw new Error('Response missing actions data');
  });

  // Test all phase-related endpoints
  await test('All Phases Endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/phases/phases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (!data.phases || data.phases.length !== 8) {
      throw new Error(`Expected 8 phases, got ${data.phases?.length || 0}`);
    }
  });

  // Test routes mounting
  await test('Routes Mounting Check', async () => {
    const endpoints = [
      '/api/auth/verify',
      '/api/projects',
      '/api/phases/phases',
      '/api/files',
      '/api/messages',
      '/api/invoices',
      '/api/users/messageable',
      '/api/dashboard/stats'
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 404) {
        throw new Error(`Route not found: ${endpoint}`);
      }
    }
  });
}

// Static file serving test
async function testStaticFiles() {
  await test('ProgressTracker.js Component', async () => {
    const response = await fetch(`${BASE_URL}/components/ProgressTracker.js`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const content = await response.text();
    if (!content.includes('export class ProgressTracker')) {
      throw new Error('ProgressTracker class not found in file');
    }
  });

  await test('Portal.js File', async () => {
    const response = await fetch(`${BASE_URL}/portal.js`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
  });

  await test('Brand Configuration', async () => {
    const response = await fetch(`${BASE_URL}/config/brand.js`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const content = await response.text();
    if (!content.includes('phaseDefinitions')) {
      throw new Error('phaseDefinitions not found in brand.js');
    }
  });
}

// Check for common issues
async function checkCommonIssues() {
  await test('Check for Duplicate Route Definitions', async () => {
    // This would need to parse server.js, but we'll check runtime behavior instead
    const response = await fetch(`${BASE_URL}/api/phases/project/test/tracking`);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error('API endpoint returning HTML - likely route issue');
    }
  });

  await test('Authentication Middleware', async () => {
    // Test without token
    const response = await fetch(`${BASE_URL}/api/phases/phases`);
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.error) {
      throw new Error('Auth middleware not returning proper error format');
    }
  });
}

// Main diagnostic runner
async function runDiagnostics() {
  console.log(chalk.bold.blue('\n🔍 Phase System Comprehensive Diagnostic\n'));
  
  try {
    // Check if server is running
    try {
      await fetch(BASE_URL);
    } catch (error) {
      console.log(chalk.red('❌ Server not running at http://localhost:3000'));
      console.log(chalk.yellow('Please start the server with: npm run dev'));
      process.exit(1);
    }

    await testDatabase();
    await testEndpoints();
    await testStaticFiles();
    await checkCommonIssues();

  } catch (error) {
    console.log(chalk.red(`\n❌ Diagnostic failed: ${error.message}`));
  }

  // Summary
  console.log(chalk.bold.blue('\n📊 Diagnostic Summary\n'));
  console.log(chalk.green(`✓ Passed: ${results.passed.length}`));
  console.log(chalk.red(`✗ Failed: ${results.failed.length}`));
  console.log(chalk.yellow(`⚠ Warnings: ${results.warnings.length}`));

  if (results.failed.length > 0) {
    console.log(chalk.red('\n❌ Failed Tests:'));
    results.failed.forEach(({ name, error }) => {
      console.log(chalk.red(`  - ${name}: ${error}`));
    });
  }

  if (results.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠ Warnings:'));
    results.warnings.forEach(warning => {
      console.log(chalk.yellow(`  - ${warning}`));
    });
  }

  if (results.failed.length === 0) {
    console.log(chalk.green('\n✅ All tests passed! System is functioning correctly.'));
  } else {
    console.log(chalk.red('\n❌ System has issues that need to be fixed.'));
  }

  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run diagnostics
runDiagnostics().catch(console.error);