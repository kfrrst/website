import fetch from 'node-fetch';

async function testAuth() {
  console.log('Testing authentication...');
  
  try {
    // Test login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@kendrickforrest.com',
        password: 'admin123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginResponse.ok && loginData.accessToken) {
      console.log('\n2. Testing /auth/me with token...');
      
      // Test /auth/me endpoint
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginData.accessToken}`
        }
      });
      
      console.log('/auth/me response status:', meResponse.status);
      const meData = await meResponse.json();
      console.log('/auth/me response:', meData);
      
      if (meResponse.ok) {
        console.log('\n✅ Authentication is working correctly!');
        console.log('User data:', {
          id: meData.user.id,
          email: meData.user.email,
          name: meData.user.name,
          role: meData.user.role
        });
      } else {
        console.log('\n❌ /auth/me failed');
      }
    } else {
      console.log('\n❌ Login failed');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuth();
