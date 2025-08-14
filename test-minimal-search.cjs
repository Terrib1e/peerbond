/**
 * Test minimal database search to isolate the issue
 */

const { DatabaseService } = require('./server/dist/services/database.js');

async function testMinimalSearch() {
  try {
    const dbService = new DatabaseService();
    
    console.log('1. Testing wellness + active only...');
    const wellnessActive = await dbService.getGroups(1, 10, { 
      type: 'wellness',
      status: true
    });
    console.log(`Found ${wellnessActive.total} wellness active groups`);
    wellnessActive.groups.forEach(g => {
      console.log(`- ${g.name}: active=${g.isActive}, private=${g.isPrivate}`);
    });
    
    console.log('\n2. Testing wellness + active + public...');
    const wellnessPublic = await dbService.getGroups(1, 10, { 
      type: 'wellness',
      status: true,
      publicOnly: true
    });
    console.log(`Found ${wellnessPublic.total} wellness public groups`);
    wellnessPublic.groups.forEach(g => {
      console.log(`- ${g.name}: active=${g.isActive}, private=${g.isPrivate}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMinimalSearch();