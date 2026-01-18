/**
 * Test database service directly
 */

const { DatabaseService } = require('../../dist/services/database.js');

async function testDatabaseService() {
  try {
    const dbService = new DatabaseService();
    
    // Test the exact filters used by searchGroups
    const searchFilters = {
      type: 'wellness', // Looking for wellness groups
      status: true, // Only active groups
      privacy: false, // Only public groups
      search: undefined
    };
    
    console.log('Testing with filters:', searchFilters);
    
    const results = await dbService.getGroups(1, 12, searchFilters);
    
    console.log(`Found ${results.total} total groups, ${results.groups.length} returned:`);
    
    results.groups.forEach(group => {
      console.log(`\n- ${group.name} (${group.type})`);
      console.log(`  Active: ${group.isActive}`);
      console.log(`  Private: ${group.isPrivate}`);
      console.log(`  Members: ${group.members?.length || 0}/${group.maxMembers}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabaseService();