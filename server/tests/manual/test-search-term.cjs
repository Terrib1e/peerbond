/**
 * Test what happens with search terms
 */

const { DatabaseService } = require('./server/dist/services/database.js');

async function testSearchTerm() {
  try {
    const dbService = new DatabaseService();
    
    console.log('Testing with search term "anxiety"...');
    const anxietyGroups = await dbService.getGroups(1, 10, { 
      type: 'wellness',
      status: true,
      publicOnly: true,
      search: 'anxiety'
    });
    console.log(`Found ${anxietyGroups.total} groups with "anxiety"`);
    anxietyGroups.groups.forEach(g => {
      console.log(`- ${g.name}: ${g.description.substring(0, 50)}...`);
    });
    
    console.log('\nTesting with search term "stress"...');
    const stressGroups = await dbService.getGroups(1, 10, { 
      type: 'wellness',
      status: true,
      publicOnly: true,
      search: 'stress'
    });
    console.log(`Found ${stressGroups.total} groups with "stress"`);
    stressGroups.groups.forEach(g => {
      console.log(`- ${g.name}: ${g.description.substring(0, 50)}...`);
    });
    
    console.log('\nTesting with complex search term "mental health wellness self-care anxiety"...');
    const complexGroups = await dbService.getGroups(1, 10, { 
      type: 'wellness',
      status: true,
      publicOnly: true,
      search: 'mental health wellness self-care anxiety'
    });
    console.log(`Found ${complexGroups.total} groups with complex search`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSearchTerm();