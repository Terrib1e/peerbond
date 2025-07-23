// Test the new AI-driven agent and tool selection system
async function testAIAgentRouting() {
  console.log('🚀 Testing AI-Driven Agent and Tool Selection...');
  
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
  
  // Test different message types to see AI routing decisions
  const testMessages = [
    {
      content: "I'm feeling anxious and overwhelmed today",
      expectedAgent: "facilitator",
      description: "Therapeutic/emotional support request"
    },
    {
      content: "I'm looking for a support group to help with my anxiety",
      expectedAgent: "matching", 
      description: "Group recommendation request"
    },
    {
      content: "How am I doing in my recovery journey?",
      expectedAgent: "insight",
      description: "Progress tracking request"
    },
    {
      content: "What should I do when I feel overwhelmed?",
      expectedAgent: "facilitator",
      description: "Advice/coping strategies request"
    },
    {
      content: "List all available groups",
      expectedAgent: "matching",
      description: "Group listing request"
    },
    {
      content: "I'm struggling with depression and need help",
      expectedAgent: "facilitator", 
      description: "General therapeutic support"
    },
    {
      content: "Can you connect me with others who understand addiction?",
      expectedAgent: "matching",
      description: "Peer connection request"
    },
    {
      content: "I want to track my progress over time",
      expectedAgent: "insight",
      description: "Progress analysis request"
    }
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`\n📝 Test ${i + 1}: "${test.content}"`);
    console.log(`   Expected Primary Agent: ${test.expectedAgent}`);
    console.log(`   Description: ${test.description}`);
    
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
    
    console.log(`   🧠 Agents Used: ${messageData.data.agentUsed.join(' → ')}`);
    console.log(`   🎯 Confidence: ${messageData.data.confidence}`);
    
    // Check if AI routing decision is included in metadata
    if (messageData.data.metadata && messageData.data.metadata.aiRoutingDecision) {
      const decision = messageData.data.metadata.aiRoutingDecision;
      console.log(`   🤖 AI Router Decision:`);
      console.log(`      Primary Agent: ${decision.primaryAgent}`);
      console.log(`      Tools: ${decision.tools.join(', ')}`);
      console.log(`      Reasoning: ${decision.reasoning}`);
      console.log(`      Router Confidence: ${decision.confidence}`);
      
      // Check if the routing matches expectations
      const correctRouting = decision.primaryAgent === test.expectedAgent;
      console.log(`   ${correctRouting ? '✅' : '❌'} Routing ${correctRouting ? 'CORRECT' : 'INCORRECT'}`);
    }
    
    // Show response preview
    console.log(`   💬 Response: "${messageData.data.response.substring(0, 100)}..."`);
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  console.log('\n🎉 AI-Driven Agent Routing Test Completed!');
}

testAIAgentRouting().catch(console.error);