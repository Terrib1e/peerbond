const { DatabaseService } = require('./server/dist/services/database.js');

async function test() {
  const dbService = new DatabaseService();
  const result = await dbService.getGroups(1, 10, { 
    type: 'wellness',
    status: true,
    publicOnly: true,
    search: 'mental health'
  });
  console.log(`Found ${result.total} groups with "mental health"`);
  result.groups.forEach(g => {
    console.log(`- ${g.name}: "${g.description}"`);
  });
}

test();