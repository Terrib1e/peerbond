// Test to see the full group recommendation response
async function testFullResponse() {
  console.log('🚀 Testing Full Group Recommendation Response...');
  
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
  
  // Send message
  const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: "I'm looking for a peer support group to help with my anxiety and connect with others who understand",
      sessionId: sessionId
    })
  });
  
  const messageData = await messageResponse.json();
  
  console.log('\n📋 FULL AI RESPONSE:');
  console.log('=====================================');
  console.log(messageData.data.response);
  console.log('=====================================');
  
  console.log('\n📊 RESPONSE METADATA:');
  console.log('Agents Used:', messageData.data.agentUsed);
  console.log('Confidence:', messageData.data.confidence);
  console.log('Suggest Group Matching:', messageData.data.suggestGroupMatching);
  console.log('Crisis Intervention:', messageData.data.needsCrisisIntervention);
  
  if (messageData.data.metadata) {
    console.log('\n🔍 ADDITIONAL METADATA:');
    console.log(JSON.stringify(messageData.data.metadata, null, 2));
  }
}

testFullResponse().catch(console.error);