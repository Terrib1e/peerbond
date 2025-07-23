// Test the full "list all groups" response
async function testListAllFull() {
  console.log('🚀 Testing Full "List all groups" Response...');
  
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
  
  // Send list all message
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
  
  console.log('\n📋 FULL LIST ALL GROUPS RESPONSE:');
  console.log('=====================================');
  console.log(messageData.data.response);
  console.log('=====================================');
  
  console.log('\n📊 Tool Results (should show all groups):');
  if (messageData.data.toolResults) {
    console.log('Tool results found:', messageData.data.toolResults.length);
  } else {
    console.log('No tool results found');
  }
}

testListAllFull().catch(console.error);