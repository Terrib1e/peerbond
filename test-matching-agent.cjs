/**
 * Test matching agent directly
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_MEMBER = {
  email: 'test.member@peerbond.com',
  password: 'testpass123'
};

async function testMatchingAgent() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, TEST_MEMBER);
    const authToken = loginResponse.data.data.token;
    const memberId = loginResponse.data.data.member.id;
    console.log('✅ Logged in as:', loginResponse.data.data.member.firstName);
    console.log('   Member ID:', memberId);
    
    // Start Maya session
    const sessionResponse = await axios.post(`${API_URL}/orchestration/session/start`, 
      { memberProfile: { memberId } },
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    const sessionId = sessionResponse.data.data.sessionId;
    console.log('✅ Session started:', sessionId);
    
    // Call matching agent directly
    console.log('\n🎯 Calling matching agent directly...');
    const matchingResponse = await axios.post(`${API_URL}/orchestration/agent/call`, {
      agentId: 'matching',
      message: "I'm looking for support groups for anxiety",
      sessionId: sessionId,
      toolName: 'searchGroups'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('\n🤖 Matching agent response:');
    console.log('   Success:', matchingResponse.data.success);
    console.log('   Agent used:', matchingResponse.data.data.agentUsed);
    console.log('   Tools used:', matchingResponse.data.data.toolsUsed);
    console.log('\n   Response:');
    console.log(matchingResponse.data.data.response);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMatchingAgent();