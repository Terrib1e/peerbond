// Check for therapist users in the database
const { PrismaClient } = require('@prisma/client');

async function checkTherapistUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for therapist users...\n');

    // Check all users
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

    console.log(`Total users: ${allUsers.length}`);
    
    // Check therapist users specifically
    const therapists = allUsers.filter(user => user.role === 'THERAPIST');
    console.log(`Therapist users: ${therapists.length}`);
    
    if (therapists.length > 0) {
      console.log('\nTherapist users found:');
      therapists.forEach(therapist => {
        console.log(`  - ${therapist.firstName} ${therapist.lastName} (${therapist.email}) - Active: ${therapist.isActive}`);
      });
    } else {
      console.log('\n❌ No therapist users found');
      
      // Create a test therapist user
      console.log('\n🔧 Creating test therapist user...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newTherapist = await prisma.user.create({
        data: {
          email: 'therapist@peerbond.com',
          password: hashedPassword,
          firstName: 'Dr. Jane',
          lastName: 'Smith',
          role: 'THERAPIST',
          isActive: true,
          experienceLevel: 'EXPERT',
          isPremium: true
        }
      });
      
      console.log(`✅ Created therapist: ${newTherapist.firstName} ${newTherapist.lastName} (${newTherapist.email})`);
    }

    // Check regular users
    const regularUsers = allUsers.filter(user => user.role === 'USER');
    console.log(`\nRegular users: ${regularUsers.length}`);
    
    if (regularUsers.length > 0) {
      console.log('Regular users found:');
      regularUsers.slice(0, 3).forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
      });
      if (regularUsers.length > 3) {
        console.log(`  ... and ${regularUsers.length - 3} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTherapistUsers();