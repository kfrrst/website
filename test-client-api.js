import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'kf_secret_jwt_2025_change_this_in_production';

// Create a token for the client user
const clientToken = jwt.sign(
  { 
    id: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e',
    userId: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e',
    email: 'client@example.com',
    role: 'client'
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Testing client dashboard APIs with token...\n');

async function testAPI(endpoint, description) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    
    const data = await response.json();
    console.log(`\n${description}:`);
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.message);
  }
}

async function runTests() {
  // Test dashboard stats
  await testAPI('/api/dashboard/stats', 'Dashboard Stats');
  
  // Test projects
  await testAPI('/api/projects', 'Projects List');
  
  // Test activity
  await testAPI('/api/activity?limit=5', 'Recent Activity');
}

runTests().then(() => {
  console.log('\nTests complete');
  process.exit(0);
});