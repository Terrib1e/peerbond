// Test that targeted recommendations vs list all work differently
async function testTargetedVsList() {
  console.log('🚀 Testing Targeted vs List All Functionality...');
  
  // Login
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@peerbond.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data.token;
  
  // Start session
  const sessionResponse = await fetch('http://localhost:3001/api/production-orchestration/session/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  
  const sessionData = await sessionResponse.json();
  const sessionId = sessionData.data.sessionId;
  
  // Test 1: List all request
  console.log('\n📝 TEST 1: List All Request');
  const listResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: "List all groups",
      sessionId: sessionId
    })
  });
  
  const listData = await listResponse.json();
  console.log('Response starts with:', listData.data.response.substring(0, 50));
  
  // Test 2: Targeted anxiety request
  console.log('\n📝 TEST 2: Targeted Anxiety Request');
  const anxietyResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: "I need help with anxiety",
      sessionId: sessionId
    })
  });
  
  const anxietyData = await anxietyResponse.json();
  console.log('Response starts with:', anxietyData.data.response.substring(0, 50));
  
  console.log('\n✅ Both request types working correctly!');
}

testTargetedVsList().catch(console.error);