import { query } from './config/database.js';

async function checkDB() {
  try {
    // Check current database
    const dbResult = await query('SELECT current_database()');
    console.log('Current database:', dbResult.rows[0].current_database);
    
    // Check all users with email like client
    const usersResult = await query(
      "SELECT id, email, created_at FROM users WHERE email LIKE '%client%' ORDER BY created_at DESC"
    );
    
    console.log('\nAll client users:');
    usersResult.rows.forEach(u => {
      console.log(`${u.id} | ${u.email} | ${u.created_at}`);
    });
    
    // Check connection string
    console.log('\nDATABASE_URL:', process.env.DATABASE_URL);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDB();