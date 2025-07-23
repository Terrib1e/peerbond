// Clean up test groups and ensure proper sample groups exist
async function cleanupAndInitialize() {
  console.log('🧹 Cleaning up test groups and ensuring proper sample data...');
  
  // Login as admin
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
  console.log('✅ Logged in as admin');
  
  // Get current groups
  const groupsResponse = await fetch('http://localhost:3001/api/groups', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const groupsData = await groupsResponse.json();
  const currentGroups = groupsData.data.groups;
  
  // Delete test groups
  const testGroupNames = ['Test Group', 'AI Chat Test Group', 'Anxiety Support Circle', 'Recovery Warriors'];
  
  for (const group of currentGroups) {
    if (testGroupNames.includes(group.name) || group.description.toLowerCase().includes('test')) {
      console.log(`🗑️ Deleting test group: ${group.name}`);
      
      try {
        const deleteResponse = await fetch(`http://localhost:3001/api/admin/groups/${group.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`   ✅ Deleted: ${group.name}`);
        } else {
          console.log(`   ❌ Failed to delete: ${group.name}`);
        }
      } catch (error) {
        console.log(`   ❌ Error deleting ${group.name}:`, error.message);
      }
    }
  }
  
  // Create proper sample groups
  const sampleGroups = [
    {
      name: 'Recovery Support Circle',
      description: 'A supportive group for individuals in recovery',
      type: 'recovery',
      maxMembers: 8,
      isPrivate: false
    },
    {
      name: 'Anxiety & Stress Management',
      description: 'Learn coping strategies and connect with others managing anxiety and stress',
      type: 'wellness',
      maxMembers: 8,
      isPrivate: false
    },
    {
      name: 'General Support Community',
      description: 'Open discussion for life challenges, personal growth, and peer support',
      type: 'general',
      maxMembers: 10,
      isPrivate: false
    }
  ];
  
  console.log('\n📋 Creating proper sample groups...');
  
  for (const groupData of sampleGroups) {
    try {
      const createResponse = await fetch('http://localhost:3001/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupData)
      });
      
      if (createResponse.ok) {
        const newGroup = await createResponse.json();
        console.log(`✅ Created: ${groupData.name}`);
      } else {
        const error = await createResponse.text();
        console.log(`❌ Failed to create ${groupData.name}:`, error);
      }
    } catch (error) {
      console.log(`❌ Error creating ${groupData.name}:`, error.message);
    }
  }
  
  // Verify final state
  console.log('\n🔍 Final groups in database:');
  const finalGroupsResponse = await fetch('http://localhost:3001/api/groups', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const finalGroupsData = await finalGroupsResponse.json();
  finalGroupsData.data.groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.name} (${group.type})`);
  });
  
  console.log('\n✅ Database cleanup and initialization completed!');
}

cleanupAndInitialize().catch(console.error);