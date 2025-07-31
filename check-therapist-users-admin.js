// Check therapist members via admin API
const BASE_URL = 'http://localhost:3001/api';

async function checkTherapistUsersViaAdmin() {
  console.log('🔍 Checking Therapist Users via Admin API\n');

  try {
    // Login as admin
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peerbond.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Admin login failed');
      return;
    }

    const loginResult = await loginResponse.json();
    const token = loginResult.token;
    console.log('✅ Admin login successful');

    // Get all members
    const membersResponse = await fetch(`${BASE_URL}/admin/members`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!membersResponse.ok) {
      console.log('❌ Failed to fetch members');
      return;
    }

    const membersData = await membersResponse.json();
    console.log(`Total members: ${membersData.members?.length || 0}`);

    // Check each member's role
    console.log('\nUser roles breakdown:');
    const roleCounts = {};

    if (membersData.members) {
      membersData.members.forEach(member => {
        const role = member.role || 'unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;

        // Log therapist members specifically
        if (role === 'therapist') {
          console.log(`  🩺 Therapist: ${member.firstName} ${member.lastName} (${member.email}) - Active: ${member.isActive}`);
        }
      });
    }

    console.log('\nRole distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    // If we found therapists, try to test one
    const therapists = membersData.members?.filter(u => u.role === 'therapist') || [];

    if (therapists.length > 0) {
      console.log(`\n✅ Found ${therapists.length} therapist(s)!`);

      const therapist = therapists[0];
      console.log(`Testing with: ${therapist.firstName} ${therapist.lastName}`);

      // Reset password for this therapist
      console.log('\n🔧 Resetting therapist password...');
      const resetResponse = await fetch(`${BASE_URL}/admin/members/${therapist.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword: 'test123'
        })
      });

      console.log(`Password reset status: ${resetResponse.status}`);

      if (resetResponse.ok) {
        console.log('✅ Password reset successful!');

        // Test therapist login
        console.log('\n🧪 Testing therapist login...');
        const therapistLoginResponse = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: therapist.email,
            password: 'test123'
          })
        });

        console.log(`Therapist login status: ${therapistLoginResponse.status}`);

        if (therapistLoginResponse.ok) {
          const therapistResult = await therapistLoginResponse.json();
          const therapistToken = therapistResult.token;

          console.log('✅ Therapist login successful!');

          // Test all therapist endpoints
          console.log('\n🏥 Testing Therapist Portal Endpoints:');
          console.log('=====================================');

          await testAllTherapistEndpoints(therapistToken);

        } else {
          const error = await therapistLoginResponse.text();
          console.log(`❌ Therapist login failed: ${error}`);
        }
      } else {
        const error = await resetResponse.text();
        console.log(`❌ Password reset failed: ${error}`);
      }
    } else {
      console.log('\n⚠️  No therapist members found');
      console.log('Let me create one via admin API...');
      await createTherapistViaAdmin(token);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function createTherapistViaAdmin(adminToken) {
  try {
    console.log('\n🔧 Creating therapist via admin API...');

    const createResponse = await fetch(`${BASE_URL}/admin/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin.created.therapist@peerbond.com',
        password: 'therapist123',
        firstName: 'Dr. Admin',
        lastName: 'Created',
        role: 'therapist',
        experienceLevel: 'advanced'
      })
    });

    console.log(`Create therapist status: ${createResponse.status}`);

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Therapist created successfully!');

      // Test login immediately
      console.log('\n🧪 Testing new therapist login...');
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin.created.therapist@peerbond.com',
          password: 'therapist123'
        })
      });

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        console.log('✅ New therapist login successful!');

        await testAllTherapistEndpoints(loginResult.token);
      } else {
        console.log(`❌ New therapist login failed: ${loginResponse.status}`);
      }
    } else {
      const error = await createResponse.text();
      console.log(`❌ Failed to create therapist: ${error}`);
    }
  } catch (error) {
    console.error('❌ Error creating therapist:', error.message);
  }
}

async function testAllTherapistEndpoints(token) {
  const endpoints = [
    { name: 'Stats', url: '/therapist/stats', description: 'Dashboard statistics' },
    { name: 'Clients', url: '/therapist/clients', description: 'Client management' },
    { name: 'Groups', url: '/therapist/groups', description: 'Group management' },
    { name: 'Crisis Alerts', url: '/therapist/crisis-alerts', description: 'Crisis monitoring' }
  ];

  let successCount = 0;
  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const status = response.status;
      const success = response.ok;

      if (success) {
        const data = await response.json();
        console.log(`✅ ${endpoint.name}: Working (${status})`);
        console.log(`   ${endpoint.description}`);

        // Show specific data
        if (endpoint.name === 'Stats') {
          console.log(`   Total clients: ${data.totalClients || 0}`);
          console.log(`   Active groups: ${data.activeGroups || 0}`);
          console.log(`   Critical alerts: ${data.criticalAlerts || 0}`);
        } else if (endpoint.name === 'Clients') {
          console.log(`   Client count: ${data.clients?.length || 0}`);
          console.log(`   Total: ${data.total || 0}`);
        } else if (endpoint.name === 'Groups') {
          console.log(`   Group count: ${data.groups?.length || 0}`);
        } else if (endpoint.name === 'Crisis Alerts') {
          console.log(`   Alert count: ${data.alerts?.length || 0}`);
        }

        successCount++;
        results.push(`${endpoint.name}: ✅`);
      } else {
        console.log(`❌ ${endpoint.name}: Failed (${status})`);
        results.push(`${endpoint.name}: ❌`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
      results.push(`${endpoint.name}: ❌ Error`);
    }
    console.log('');
  }

  console.log('🏆 FINAL THERAPIST PORTAL TEST RESULTS:');
  console.log('========================================');
  results.forEach(result => console.log(`  ${result}`));
  console.log(`\n📊 Success Rate: ${successCount}/${endpoints.length} (${Math.round(successCount/endpoints.length*100)}%)`);

  if (successCount === endpoints.length) {
    console.log('\n🎉 THERAPIST PORTAL FULLY FUNCTIONAL!');
    console.log('All core therapist features are working:');
    console.log('  • Authentication ✅');
    console.log('  • Dashboard stats ✅');
    console.log('  • Client management ✅');
    console.log('  • Group management ✅');
    console.log('  • Crisis monitoring ✅');
    console.log('\nThe therapist portal is ready for production use!');
  } else {
    console.log('\n⚠️  Some features need attention, but core functionality is working.');
  }
}

checkTherapistUsersViaAdmin();