// Test the connection request fix
async function testConnectionFix() {
  console.log('🚀 Testing Connection Request Fix...');
  
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
  
  // Test the previously failing case
  const testContent = "Can you connect me with others who understand addiction?";
  
  const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: testContent,
      sessionId: sessionId
    })
  });
  
  const messageData = await messageResponse.json();
  
  console.log(`📝 Test: "${testContent}"`);
  console.log(`🧠 Agents Used: ${messageData.data.agentUsed.join(' → ')}`);
  
  if (messageData.data.metadata && messageData.data.metadata.aiRoutingDecision) {
    const decision = messageData.data.metadata.aiRoutingDecision;
    console.log(`🤖 AI Router Decision:`);
    console.log(`   Primary Agent: ${decision.primaryAgent}`);
    console.log(`   Tools: ${decision.tools.join(', ')}`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    
    const correctRouting = decision.primaryAgent === 'matching';
    console.log(`${correctRouting ? '✅ FIXED' : '❌ STILL BROKEN'} - Should route to matching agent`);
  }
  
  console.log(`💬 Response: "${messageData.data.response.substring(0, 150)}..."`);
}

testConnectionFix().catch(console.error);