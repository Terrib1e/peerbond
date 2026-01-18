/**
 * Test simple query
 */

const { DatabaseService } = require('../../dist/services/database.js');

async function testSimpleQuery() {
  try {
    const dbService = new DatabaseService();
    
    // Test with no filters first
    console.log('1. Testing with no filters...');
    const allGroups = await dbService.getGroups(1, 10, {});
    console.log(`Found ${allGroups.total} total groups, ${allGroups.groups.length} returned`);
    
    // Test with just status filter
    console.log('\n2. Testing with just status filter...');
    const activeGroups = await dbService.getGroups(1, 10, { status: true });
    console.log(`Found ${activeGroups.total} active groups, ${activeGroups.groups.length} returned`);
    
    // Test with status and privacy
    console.log('\n3. Testing with status and privacy...');
    const publicActiveGroups = await dbService.getGroups(1, 10, { status: true, privacy: false });
    console.log(`Found ${publicActiveGroups.total} public active groups, ${publicActiveGroups.groups.length} returned`);
    
    // Test with all filters including type
    console.log('\n4. Testing with all filters...');
    const wellnessGroups = await dbService.getGroups(1, 10, { 
      status: true, 
      publicOnly: true, 
      type: 'wellness' 
    });
    console.log(`Found ${wellnessGroups.total} wellness groups, ${wellnessGroups.groups.length} returned`);
    wellnessGroups.groups.forEach(g => {
      console.log(`- ${g.name}: type=${g.type}, active=${g.isActive}, private=${g.isPrivate}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

testSimpleQuery();