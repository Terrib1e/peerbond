const { spawn } = require('child_process');

// Test the group recommendation functionality
async function testGroupRecommendations() {
  console.log('🚀 Testing Group Recommendations...');
  
  // First, let's get a valid auth token by logging in
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@peerbond.com',
      password: 'password123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    return;
  }
  
  const loginData = await loginResponse.json();
  const token = loginData.data.token;
  console.log('✅ Logged in successfully');
  
  // Start an orchestration session
  console.log('🔄 Starting orchestration session...');
  const sessionResponse = await fetch('http://localhost:3001/api/production-orchestration/session/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userProfile: {
        interests: ['peer-support', 'mental-health'],
        experience: 'beginner',
        goals: ['anxiety_management', 'social_connection']
      }
    })
  });
  
  if (!sessionResponse.ok) {
    console.error('❌ Session start failed:', await sessionResponse.text());
    return;
  }
  
  const sessionData = await sessionResponse.json();
  const sessionId = sessionData.data.sessionId;
  console.log('✅ Session started:', sessionId);
  
  // Test group recommendation requests
  const testMessages = [
    "I'm looking for a support group to help with my anxiety",
    "Can you recommend a group for me? I'm dealing with stress and need peer support",
    "I want to connect with others who understand what I'm going through with depression",
    "Find me a recovery group that can help with my journey"
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
    
    if (!messageResponse.ok) {
      console.error('❌ Message failed:', await messageResponse.text());
      continue;
    }
    
    const messageData = await messageResponse.json();
    console.log('✅ Response received:');
    console.log('  🤖 AI Response:', messageData.data.response.substring(0, 200) + '...');
    console.log('  🧠 Agents Used:', messageData.data.agentUsed);
    console.log('  🎯 Confidence:', messageData.data.confidence);
    console.log('  📊 Suggest Group Matching:', messageData.data.suggestGroupMatching);
    
    if (messageData.data.metadata && messageData.data.metadata.groupRecommendations) {
      console.log('  🏢 Group Recommendations Found!');
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Group recommendation testing completed!');
}

// Run the test
testGroupRecommendations().catch(console.error);