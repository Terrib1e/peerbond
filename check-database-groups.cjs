// Check what groups are actually in the database
async function checkDatabaseGroups() {
  console.log('🔍 Checking actual database groups...');
  
  // Login
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@peerbond.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data.token;
  
  // Get groups via API
  const groupsResponse = await fetch('http://localhost:3001/api/groups', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!groupsResponse.ok) {
    console.error('❌ Failed to fetch groups:', await groupsResponse.text());
    return;
  }
  
  const groupsData = await groupsResponse.json();
  console.log('\n📋 ACTUAL DATABASE GROUPS:');
  console.log('=====================================');
  
  if (groupsData.data && groupsData.data.groups) {
    groupsData.data.groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name}`);
      console.log(`   Type: ${group.type}`);
      console.log(`   Description: ${group.description}`);
      console.log(`   Members: ${group.members ? group.members.length : 0}/${group.maxMembers || 8}`);
      console.log(`   Active: ${group.isActive}`);
      console.log(`   Private: ${group.isPrivate}`);
      console.log(`   ID: ${group.id}`);
      console.log('');
    });
  } else {
    console.log('No groups found or unexpected response format');
    console.log('Response:', JSON.stringify(groupsData, null, 2));
  }
}

checkDatabaseGroups().catch(console.error);