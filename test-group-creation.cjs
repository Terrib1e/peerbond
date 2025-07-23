// Test group creation via API
async function testGroupCreation() {
  console.log('🚀 Testing Group Creation...');
  
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
  console.log('✅ Logged in successfully');
  
  // Create a test group
  const newGroup = {
    name: 'Test API Group Creation',
    description: 'Testing group creation via API call',
    type: 'wellness',
    maxMembers: 6,
    isPrivate: false,
    tags: ['test', 'api']
  };
  
  console.log('📝 Creating group:', newGroup.name);
  
  try {
    const createResponse = await fetch('http://localhost:3001/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newGroup)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Group creation failed:', errorText);
      return;
    }
    
    const createdGroup = await createResponse.json();
    console.log('✅ Group created successfully!');
    console.log('   Name:', createdGroup.data.group.name);
    console.log('   Type:', createdGroup.data.group.type);
    console.log('   ID:', createdGroup.data.group.id);
    
    // Verify it appears in the groups list
    console.log('\n🔍 Verifying group appears in list...');
    const groupsResponse = await fetch('http://localhost:3001/api/groups', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const groupsData = await groupsResponse.json();
    const foundGroup = groupsData.data.groups.find(g => g.id === createdGroup.data.group.id);
    
    if (foundGroup) {
      console.log('✅ Group successfully appears in groups list');
      console.log('   Listed as:', foundGroup.name);
    } else {
      console.log('❌ Group not found in groups list');
    }
    
  } catch (error) {
    console.error('❌ Error during group creation test:', error);
  }
}

testGroupCreation().catch(console.error);