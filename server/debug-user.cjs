// Debug user data in database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function debugUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging user authentication...\n');

    // Check for our test users
    const testEmails = [
      'simple.test@peerbond.com',
      'working.therapist@peerbond.com'
    ];

    for (const email of testEmails) {
      console.log(`Checking user: ${email}`);
      
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          password: true
        }
      });

      if (user) {
        console.log(`  ✅ Found user: ${user.firstName} ${user.lastName}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Password length: ${user.password?.length || 0}`);
        
        // Test password comparison
        if (user.password) {
          const isValid = await bcrypt.compare('password123', user.password);
          console.log(`  Password check: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        }
      } else {
        console.log(`  ❌ User not found`);
      }
      console.log('');
    }

    // List all users to see what we have
    console.log('All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    allUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}, Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();