import { query } from './config/database.js';
import bcrypt from 'bcryptjs';

async function debugLogin() {
  try {
    console.log('Debugging login for client@example.com...\n');
    
    // Query the database directly
    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      ['client@example.com']
    );
    
    if (result.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found in database:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.first_name, user.last_name);
    console.log('Role:', user.role);
    console.log('Active:', user.is_active);
    
    // Test password
    const testPassword = 'client123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('\nPassword "client123" is valid:', isValid);
    
    // Check projects for this user
    const projectsResult = await query(
      'SELECT COUNT(*) as total FROM projects WHERE client_id = $1',
      [user.id]
    );
    
    console.log('\nProjects for this user:', projectsResult.rows[0].total);
    
    // List projects
    const projectsList = await query(
      'SELECT id, name, status FROM projects WHERE client_id = $1 LIMIT 5',
      [user.id]
    );
    
    console.log('\nFirst 5 projects:');
    projectsList.rows.forEach(p => {
      console.log(`- ${p.name} (${p.status})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugLogin();