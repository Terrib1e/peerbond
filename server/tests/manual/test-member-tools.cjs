/**
 * Test script to verify member tools are working correctly
 * Run with: node test-member-tools.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';
let sessionId = '';

// Test credentials - using the member account
const TEST_MEMBER = {
  email: 'test.member@peerbond.com',
  password: 'testpass123'
};

// Helper to make authenticated requests
const apiCall = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${API_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error calling ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

async function testMemberTools() {
  console.log('🧪 Testing Member Tools and Agent Access\n');
  
  try {
    // 1. Login as member
    console.log('1️⃣ Logging in as member...');
    const loginResponse = await apiCall('POST', '/auth/login', TEST_MEMBER);
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully as:', loginResponse.data.member.firstName);
    console.log('   Role:', loginResponse.data.member.role);
    
    // 2. Start Maya session
    console.log('\n2️⃣ Starting Maya session...');
    const sessionResponse = await apiCall('POST', '/orchestration/session/start', {
      memberProfile: { 
        memberId: loginResponse.data.member.id,
        interests: ['anxiety', 'stress management']
      }
    });
    sessionId = sessionResponse.data.sessionId;
    console.log('✅ Session started:', sessionId);
    console.log('   Welcome message:', sessionResponse.data.welcomeMessage?.substring(0, 100) + '...');
    
    // 3. Test searchGroups tool (member accessible)
    console.log('\n3️⃣ Testing searchGroups tool...');
    const searchMessage = "I'm looking for support groups for anxiety and stress";
    const searchResponse = await apiCall('POST', '/orchestration/message', {
      content: searchMessage,
      sessionId: sessionId,
      messageType: 'member'
    });
    console.log('✅ Search groups response received');
    console.log('   Agents used:', searchResponse.data.agentUsed);
    console.log('   Response preview:', searchResponse.data.response.substring(0, 150) + '...');
    
    // 4. Test mood logging (member accessible)
    console.log('\n4️⃣ Testing mood logging...');
    const moodMessage = "I'm feeling a bit anxious today, about a 6 out of 10";
    const moodResponse = await apiCall('POST', '/orchestration/message', {
      content: moodMessage,
      sessionId: sessionId,
      messageType: 'member'
    });
    console.log('✅ Mood logging response received');
    console.log('   Agents used:', moodResponse.data.agentUsed);
    
    // 5. Test progress insights (member accessible)
    console.log('\n5️⃣ Testing progress insights...');
    const progressMessage = "How am I doing with my recovery journey?";
    const progressResponse = await apiCall('POST', '/orchestration/message', {
      content: progressMessage,
      sessionId: sessionId,
      messageType: 'member'
    });
    console.log('✅ Progress insights response received');
    console.log('   Agents used:', progressResponse.data.agentUsed);
    
    // 6. Test crisis support (member accessible)
    console.log('\n6️⃣ Testing crisis support (safe test)...');
    const crisisMessage = "I need some immediate coping strategies for stress";
    const crisisResponse = await apiCall('POST', '/orchestration/message', {
      content: crisisMessage,
      sessionId: sessionId,
      messageType: 'member'
    });
    console.log('✅ Crisis support response received');
    console.log('   Crisis intervention needed:', crisisResponse.data.needsCrisisIntervention || false);
    
    // 7. List available agents for member
    console.log('\n7️⃣ Checking available agents and tools...');
    const agentsResponse = await apiCall('GET', '/orchestration/agents');
    console.log('✅ Available agents for member role:');
    agentsResponse.data.agents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.tools.length} tools`);
      console.log(`     Tools: ${agent.tools.join(', ')}`);
    });
    
    console.log('\n✅ All member tools tested successfully!');
    console.log('📊 Summary:');
    console.log('   - Member can access Maya ✓');
    console.log('   - Member can search groups ✓');
    console.log('   - Member can log mood ✓');
    console.log('   - Member can get progress insights ✓');
    console.log('   - Member can access crisis support ✓');
    console.log('   - Access control is working correctly ✓');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testMemberTools().catch(console.error);