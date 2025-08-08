// Test script to debug project details endpoint
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Create a test token for the client user
const testUserId = '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e'; // client@example.com
const testToken = jwt.sign(
  { 
    id: testUserId, 
    userId: testUserId, 
    email: 'client@example.com', 
    role: 'client' 
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Test token created for user:', testUserId);
console.log('Token:', testToken);

// Test the debug endpoint
async function testDebugEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/projects/debug/user', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    const data = await response.json();
    console.log('\n=== Debug Endpoint Response ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Debug endpoint error:', error);
  }
}

// Test the project details endpoint
async function testProjectDetails() {
  const projectId = '1cdf30e1-548a-4086-9ada-77eecacd39bf';
  
  try {
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}/details`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    const data = await response.json();
    console.log('\n=== Project Details Response ===');
    console.log('Status:', response.status);
    if (response.ok) {
      console.log('Project Name:', data.project?.name);
      console.log('Current Phase:', data.project?.current_phase);
      console.log('Phases:', data.project?.phases?.length || 0);
    } else {
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Project details error:', error);
  }
}

// Run tests
async function runTests() {
  console.log('Starting tests...\n');
  await testDebugEndpoint();
  await testProjectDetails();
  console.log('\nTests complete.');
}

runTests();