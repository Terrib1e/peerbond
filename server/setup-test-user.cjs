const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Setting up test member for orchestration testing...');

    const testEmail = 'test@orchestration.dev';
    const testPassword = 'TestPass123!';

    // Check if member already exists
    const existingUser = await prisma.member.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      console.log('✅ Test member already exists');
      console.log('📧 Email:', testEmail);
      console.log('🔑 Password:', testPassword);
      console.log('🆔 User ID:', existingUser.id);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 12);

    // Create member
    const newUser = await prisma.member.create({
      data: {
        id: 'test-orchestration-member',
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: hashedPassword,
        recoveryGoals: JSON.stringify(['anxiety', 'stress']),
        wellnessGoals: JSON.stringify(['better_sleep', 'mindfulness']),
        experienceLevel: 'beginner',
        role: 'member',
        isPremium: false,
        isActive: true
      }
    });

    console.log('✅ Test member created successfully!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('🆔 User ID:', newUser.id);
    console.log('\n🚀 You can now login with these credentials to test orchestration');

  } catch (error) {
    console.error('❌ Error creating test member:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();