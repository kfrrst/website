// Script to get a valid JWT token for testing
import fetch from 'node-fetch';

async function getTestToken() {
  try {
    // Try to login with the test client account
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@client.com',
        password: 'test123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      const token = data.accessToken || data.token;
      console.log('Token:', token);
      console.log('\nTo test the API, use:');
      console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/projects`);
      
      // Also save it for easy use
      if (token) {
        import('fs').then(fs => {
          fs.writeFileSync('.test-token', token);
          console.log('\nToken saved to .test-token');
        });
      }
      
      return token;
    } else {
      const error = await response.text();
      console.error('Login failed:', response.status, error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getTestToken();