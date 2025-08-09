import bcrypt from 'bcryptjs';
import { query } from './config/database.js';

async function createAdmin() {
  try {
    // Check if admin already exists
    const existing = await query("SELECT id FROM users WHERE email = 'admin@example.com'");
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const result = await query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, is_active, created_at
      ) VALUES (
        gen_random_uuid(), 'admin@example.com', $1, 'Admin', 'User', 'admin', true, CURRENT_TIMESTAMP
      ) RETURNING id, email
    `, [hashedPassword]);
    
    console.log('✅ Admin user created successfully:', result.rows[0].email);
  } catch (error) {
    console.error('Error creating admin:', error);
  }
  
  process.exit(0);
}

createAdmin();