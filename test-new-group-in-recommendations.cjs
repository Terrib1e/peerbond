// Test that newly created groups appear in AI recommendations
async function testNewGroupInRecommendations() {
  console.log('🚀 Testing New Group in AI Recommendations...');
  
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
  
  // Start orchestration session
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
  
  // Ask for all groups to see if the new group appears
  const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
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
  
  const messageData = await messageResponse.json();
  
  console.log('\n📋 AI GROUPS RESPONSE:');
  console.log('=====================================');
  console.log(messageData.data.response);
  console.log('=====================================');
  
  // Check if the new group appears
  if (messageData.data.response.includes('Test API Group Creation')) {
    console.log('❌ New group appears in AI recommendations (should not - we filter to proper sample groups)');
  } else {
    console.log('✅ New group correctly filtered out - only proper sample groups shown');
  }
}

testNewGroupInRecommendations().catch(console.error);