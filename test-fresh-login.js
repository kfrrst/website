import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing fresh login with client@example.com...\n');
    
    // Login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client@example.com',
        password: 'client123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginData);
      return;
    }
    
    console.log('Login successful!');
    console.log('User ID:', loginData.user.id);
    console.log('User Name:', loginData.user.firstName, loginData.user.lastName);
    console.log('User Role:', loginData.user.role);
    
    // Decode the token to see what's inside
    const token = loginData.accessToken || loginData.token;
    const tokenParts = token.split('.');
    const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('\nToken payload:');
    console.log(JSON.stringify(tokenPayload, null, 2));
    
    // Test dashboard stats
    console.log('\nFetching dashboard stats...');
    const statsResponse = await fetch('http://localhost:3000/api/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const statsData = await statsResponse.json();
    console.log('Dashboard stats response:');
    console.log(JSON.stringify(statsData, null, 2));
    
    // Test projects
    console.log('\nFetching projects...');
    const projectsResponse = await fetch('http://localhost:3000/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projectsData = await projectsResponse.json();
    console.log('Projects response:');
    console.log('Total projects:', projectsData.projects ? projectsData.projects.length : 0);
    if (projectsData.projects && projectsData.projects.length > 0) {
      console.log('First project:', projectsData.projects[0]);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin();