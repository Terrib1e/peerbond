// Test all endpoints to see what's actually working
async function testEndpoints() {
  const baseUrl = 'http://localhost:3001';
  
  const endpoints = [
    { name: 'Server Health', url: `${baseUrl}/health` },
    { name: 'Basic Chat Health', url: `${baseUrl}/api/basic-chat/health` },
    { name: 'Simple AI Health', url: `${baseUrl}/api/simple-ai/health` },
    { name: 'Production Orchestration Health', url: `${baseUrl}/api/production-orchestration/health` },
  ];
  
  console.log('Testing all endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url);
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response:', JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.log('❌ Error response:', text);
      }
      
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
    
    console.log('-'.repeat(50));
  }
  
  // Test authenticated endpoint
  console.log('\nTesting authenticated endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/production-orchestration/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({})
    });
    
    console.log(`Auth test status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Auth test response:', text);
    
  } catch (error) {
    console.log('❌ Auth test error:', error.message);
  }
}

testEndpoints();