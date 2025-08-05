/**
 * Test group search functionality with real data
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_MEMBER = {
  email: 'test.member@peerbond.com',
  password: 'testpass123'
};

async function testGroupSearch() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, TEST_MEMBER);
    const authToken = loginResponse.data.data.token;
    console.log('✅ Logged in as:', loginResponse.data.data.member.firstName);
    
    // Get available groups
    const groupsResponse = await axios.get(`${API_URL}/groups/available`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('\n📋 Available Groups:');
    const groups = groupsResponse.data.data.groups;
    
    if (groups.length === 0) {
      console.log('   No groups found in database');
    } else {
      groups.forEach(group => {
        console.log(`\n   ${group.name}`);
        console.log(`   - Type: ${group.type}`);
        console.log(`   - Description: ${group.description}`);
        console.log(`   - Members: ${group.members?.length || 0}/${group.maxMembers}`);
        console.log(`   - Tags: ${group.tags?.join(', ') || 'None'}`);
      });
    }
    
    // Start Maya session
    const sessionResponse = await axios.post(`${API_URL}/orchestration/session/start`, 
      { memberProfile: { memberId: loginResponse.data.data.member.id } },
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    const sessionId = sessionResponse.data.data.sessionId;
    
    // Test group search through Maya
    console.log('\n🔍 Testing Maya group search...');
    const searchResponse = await axios.post(`${API_URL}/orchestration/message`, {
      content: "I'm looking for support groups for anxiety",
      sessionId: sessionId,
      messageType: 'member'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('\n🤖 Maya\'s response:');
    console.log(searchResponse.data.data.response);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGroupSearch();