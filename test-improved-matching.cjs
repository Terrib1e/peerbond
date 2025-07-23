// Test the improved group matching detection
async function testImprovedMatching() {
  console.log('🚀 Testing Improved Group Matching Detection...');
  
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
  
  // Test different types of messages
  const testMessages = [
    {
      content: "I'm just getting a generic message groups",
      expectMatching: false,
      description: "Generic complaint about messages (should NOT trigger matching)"
    },
    {
      content: "I'm feeling anxious and need support",
      expectMatching: false,
      description: "Mental health support request (should NOT trigger matching)"
    },
    {
      content: "I'm looking for a support group to help with anxiety",
      expectMatching: true,
      description: "Explicit group request (should trigger matching)"
    },
    {
      content: "Can you recommend a group for me?",
      expectMatching: true,
      description: "Group recommendation request (should trigger matching)"
    },
    {
      content: "List all groups",
      expectMatching: true,
      description: "List all request (should trigger matching)"
    },
    {
      content: "Help me connect with others who understand",
      expectMatching: true,
      description: "Connect request with peer context (should trigger matching)"
    },
    {
      content: "I need help dealing with stress",
      expectMatching: false,
      description: "General support request (should NOT trigger matching)"
    }
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`\n📝 Test ${i + 1}: "${test.content}"`);
    console.log(`   Expected: ${test.expectMatching ? 'SHOULD' : 'SHOULD NOT'} trigger matching`);
    
    const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: test.content,
        sessionId: sessionId
      })
    });
    
    const messageData = await messageResponse.json();
    const isMatching = messageData.data.suggestGroupMatching === true;
    const usedMatchingAgent = messageData.data.agentUsed.includes('matching');
    
    console.log(`   Result: ${isMatching ? 'DID' : 'DID NOT'} trigger matching`);
    console.log(`   Agents: ${messageData.data.agentUsed.join(', ')}`);
    
    const correct = isMatching === test.expectMatching;
    console.log(`   ${correct ? '✅ CORRECT' : '❌ INCORRECT'} - ${test.description}`);
    
    if (!correct) {
      console.log(`   Response preview: ${messageData.data.response.substring(0, 100)}...`);
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testImprovedMatching().catch(console.error);