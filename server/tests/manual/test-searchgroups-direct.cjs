/**
 * Test searchGroups tool directly
 */

const { searchGroups } = require('../../dist/tools/implementations/searchGroups.js');

async function testSearchGroupsDirect() {
  try {
    const params = {
      memberMessage: "I'm looking for support groups for anxiety",
      maxResults: 6
    };
    
    const context = {
      memberId: 'cmdx386gn00006p22k7rtmyfg', // Our test member
      sessionId: 'test-session',
      timestamp: new Date()
    };
    
    console.log('Calling searchGroups with:');
    console.log('- Message:', params.memberMessage);
    console.log('- Member ID:', context.memberId);
    
    const result = await searchGroups(params, context);
    
    console.log('\nResult:');
    console.log('- Success:', result.success);
    console.log('- Data:', JSON.stringify(result.data, null, 2));
    console.log('- Metadata:', JSON.stringify(result.metadata, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

testSearchGroupsDirect();