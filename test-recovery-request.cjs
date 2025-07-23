// Test recovery-specific group recommendation
async function testRecoveryRequest() {
  console.log('🚀 Testing Recovery Group Recommendation...');
  
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
  
  // Send recovery-focused message
  const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: "I'm in recovery from addiction and looking for a support group with others on the same journey",
      sessionId: sessionId
    })
  });
  
  const messageData = await messageResponse.json();
  
  console.log('\n📋 RECOVERY GROUP RECOMMENDATIONS:');
  console.log('=====================================');
  console.log(messageData.data.response);
  console.log('=====================================');
}

testRecoveryRequest().catch(console.error);