/**
 * Test simple wellness group search without complex search terms
 */

const { searchGroups } = require('../../dist/tools/implementations/searchGroups.js');

async function testSimpleWellness() {
  try {
    const params = {
      memberMessage: "wellness",
      groupType: 'wellness',
      maxResults: 6
    };
    
    const context = {
      memberId: 'cmdx386gn00006p22k7rtmyfg',
      sessionId: 'test-session',
      timestamp: new Date()
    };
    
    console.log('Testing simple wellness search...');
    
    const result = await searchGroups(params, context);
    
    console.log('\nResult:');
    console.log('- Success:', result.success);
    console.log('- Groups found:', result.data.groups?.length || 0);
    if (result.data.groups?.length > 0) {
      result.data.groups.forEach(g => {
        console.log(`  - ${g.name} (${g.type})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimpleWellness();