// Debug script to test orchestration endpoint with proper auth
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3001';

async function testWithAuth() {
  try {
    console.log('1. Testing health endpoint (no auth)...');
    
    const healthResponse = await fetch(`${baseUrl}/api/orchestration/health`);
    const healthData = await healthResponse.json();
    console.log('Health response:', JSON.stringify(healthData, null, 2));
    
    if (!healthResponse.ok) {
      console.error('❌ Health check failed:', healthResponse.status);
      return;
    }
    
    console.log('✅ Health check passed');
    
    console.log('\n2. Testing login to get auth token...');
    
    // Try to login to get a token
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('⚠️ Login failed - this might be expected if no test user exists');
      console.log('Creating a test user first might be needed');
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    
    console.log('✅ Login successful');
    
    console.log('\n3. Testing session creation...');
    
    const sessionResponse = await fetch(`${baseUrl}/api/orchestration/session/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });
    
    if (!sessionResponse.ok) {
      console.error('❌ Session creation failed:', sessionResponse.status);
      const errorText = await sessionResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const sessionData = await sessionResponse.json();
    console.log('Session response:', JSON.stringify(sessionData, null, 2));
    
    const sessionId = sessionData.data.sessionId;
    
    console.log('\n4. Testing message processing...');
    
    const messageResponse = await fetch(`${baseUrl}/api/orchestration/message`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sessionId,
        content: 'Hello, I need some help with anxiety',
        messageType: 'user'
      })
    });
    
    if (!messageResponse.ok) {
      console.error('❌ Message processing failed:', messageResponse.status);
      const errorText = await messageResponse.text();
      console.error('Error:', errorText);
      return;
    }
    
    const messageData = await messageResponse.json();
    console.log('✅ Message response:', JSON.stringify(messageData, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Also test just the health endpoint to make sure server is running
async function quickTest() {
  try {
    console.log('Quick test - is server running?');
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.text();
    console.log('Server health:', data);
  } catch (error) {
    console.error('❌ Server might not be running:', error.message);
  }
}

console.log('Starting orchestration debug test...\n');
quickTest().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  testWithAuth();
});