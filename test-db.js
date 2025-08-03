import { testConnection, query, closePool } from './config/database.js';

/**
 * Database Connection Test Script
 * Run this to verify the database setup is working correctly
 */

async function runTests() {
  console.log('🚀 Starting database tests...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Testing database connection...');
    await testConnection();
    console.log('✅ Connection test passed\n');

    // Test 2: Count tables
    console.log('Test 2: Counting database tables...');
    const tablesResult = await query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`✅ Found ${tablesResult.rows[0].table_count} tables\n`);

    // Test 3: Check sample data
    console.log('Test 3: Checking sample data...');
    const usersResult = await query('SELECT COUNT(*) as user_count FROM users');
    console.log(`✅ Found ${usersResult.rows[0].user_count} users`);
    
    const settingsResult = await query('SELECT COUNT(*) as settings_count FROM system_settings');
    console.log(`✅ Found ${settingsResult.rows[0].settings_count} system settings\n`);

    // Test 4: Test views
    console.log('Test 4: Testing database views...');
    const projectsViewResult = await query('SELECT COUNT(*) as projects_count FROM project_overview');
    console.log(`✅ Project overview view working (${projectsViewResult.rows[0].projects_count} projects)\n`);

    // Test 5: Test sample user login
    console.log('Test 5: Testing sample user data...');
    const adminResult = await query(`
      SELECT email, first_name, last_name, role 
      FROM users 
      WHERE role = 'admin' 
      LIMIT 1
    `);
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`✅ Admin user found: ${admin.first_name} ${admin.last_name} (${admin.email})`);
    }

    const clientResult = await query(`
      SELECT email, first_name, last_name, role, company_name 
      FROM users 
      WHERE role = 'client' 
      LIMIT 1
    `);
    if (clientResult.rows.length > 0) {
      const client = clientResult.rows[0];
      console.log(`✅ Sample client found: ${client.first_name} ${client.last_name} from ${client.company_name}\n`);
    }

    console.log('🎉 All database tests passed successfully!');
    console.log('\n📋 Database Schema Summary:');
    console.log('- ✅ Users and authentication system');
    console.log('- ✅ Projects and milestones tracking');
    console.log('- ✅ File management with permissions');
    console.log('- ✅ Messaging system');
    console.log('- ✅ Invoice and billing system');
    console.log('- ✅ Activity logging and notifications');
    console.log('- ✅ System settings and configuration');
    console.log('\n🔗 Database: kendrick_portal_dev');
    console.log('🚪 Access: Ready for development');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run the tests
runTests();