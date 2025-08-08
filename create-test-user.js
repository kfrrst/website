import bcrypt from 'bcryptjs';
import { query } from './config/database.js';

async function createTestUser() {
  try {
    console.log('Creating test client user...');
    
    // Hash the password
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Delete existing test user if exists
    await query(`DELETE FROM users WHERE email = 'test@client.com'`);
    
    // Create test client user
    const result = await query(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role,
        company_name,
        is_active,
        email_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, true)
      RETURNING id, email
    `, [
      'test@client.com',
      hashedPassword,
      'Test',
      'Client',
      'client',
      'Test Company Inc.'
    ]);
    
    const userId = result.rows[0].id;
    console.log('Created test user:', result.rows[0]);
    
    // Create a test project for this user
    const projectResult = await query(`
      INSERT INTO projects (
        name,
        client_id,
        status,
        description,
        budget_amount,
        progress_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name
    `, [
      'Website Redesign Project',
      userId,
      'in_progress',
      'Complete redesign of company website with new branding',
      15000,
      38
    ]);
    
    console.log('Created test project:', projectResult.rows[0]);
    
    // Skip activity log for now - it has additional required fields
    
    console.log('\n✅ Test user created successfully!');
    console.log('Email: test@client.com');
    console.log('Password: test123');
    console.log('\nYou can now login with these credentials');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();