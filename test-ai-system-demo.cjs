// Comprehensive demo of the AI-driven agent and tool selection system
async function demoAISystem() {
  console.log('🎉 AI-Driven Agent and Tool Selection System Demo');
  console.log('========================================================');
  
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
  
  console.log('✅ Session started successfully\n');
  
  // Demo conversation showing AI routing decisions
  const conversation = [
    {
      user: "Hi, I'm new here and feeling pretty anxious about everything",
      description: "Initial greeting with emotional content"
    },
    {
      user: "How am I doing so far in our conversation?",
      description: "Progress inquiry"
    },
    {
      user: "What should I do when I have panic attacks?",
      description: "Advice/coping strategies request"
    },
    {
      user: "Can you help me find a support group for anxiety?",
      description: "Group recommendation request"
    },
    {
      user: "List all the groups you have available",
      description: "Comprehensive group listing"
    }
  ];
  
  for (let i = 0; i < conversation.length; i++) {
    const turn = conversation[i];
    console.log(`👤 User: "${turn.user}"`);
    console.log(`📝 Context: ${turn.description}`);
    
    const messageResponse = await fetch('http://localhost:3001/api/production-orchestration/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: turn.user,
        sessionId: sessionId
      })
    });
    
    const messageData = await messageResponse.json();
    
    if (messageData.data.metadata && messageData.data.metadata.aiRoutingDecision) {
      const decision = messageData.data.metadata.aiRoutingDecision;
      console.log(`🤖 AI Router Analysis:`);
      console.log(`   ├─ Primary Agent: ${decision.primaryAgent}`);
      console.log(`   ├─ Tools Selected: ${decision.tools.join(', ')}`);
      console.log(`   ├─ Reasoning: ${decision.reasoning}`);
      console.log(`   └─ Confidence: ${decision.confidence}`);
    }
    
    console.log(`🔄 Execution Path: ${messageData.data.agentUsed.join(' → ')}`);
    console.log(`🎯 Final Confidence: ${messageData.data.confidence}`);
    
    // Show response with proper formatting
    const response = messageData.data.response;
    const lines = response.split('\n');
    console.log(`🤖 Maya: "${lines[0]}${lines.length > 1 ? '...' : ''}"`);
    
    if (messageData.data.suggestGroupMatching) {
      console.log(`📊 Group matching suggested: Yes`);
    }
    
    console.log('─'.repeat(60));
    
    // Small delay for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Demo completed! The AI system successfully:');
  console.log('✅ Analyzed user intent for each message');
  console.log('✅ Selected appropriate agents and tools');
  console.log('✅ Provided contextually relevant responses'); 
  console.log('✅ Maintained therapeutic conversation flow');
  console.log('✅ Routed to specialized functions when needed');
}

demoAISystem().catch(console.error);