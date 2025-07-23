// Test the "list all groups" functionality
async function testListGroups() {
  console.log('🚀 Testing "List all groups" request...');
  
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
  
  // Test different ways to ask for group listing
  const testMessages = [
    "List all groups",
    "Show me all available groups",
    "What groups are available?",
    "List all available support groups"
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    console.log(`\n📝 Test ${i + 1}: "${testMessages[i]}"`);
    
    const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: testMessages[i],
        sessionId: sessionId
      })
    });
    
    const messageData = await messageResponse.json();
    console.log('✅ Response:');
    console.log('  🤖 AI Response:', messageData.data.response.substring(0, 200) + '...');
    console.log('  🧠 Agents Used:', messageData.data.agentUsed);
    console.log('  📊 Suggest Group Matching:', messageData.data.suggestGroupMatching);
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testListGroups().catch(console.error);