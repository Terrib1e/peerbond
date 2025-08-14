/**
 * Create a test member account for testing
 */

const bcrypt = require('./server/node_modules/bcryptjs');
const { PrismaClient } = require('./server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function createTestMember() {
  try {
    // Check if test member already exists
    const existing = await prisma.member.findUnique({
      where: { email: 'test.member@peerbond.com' }
    });
    
    if (existing) {
      console.log('✅ Test member already exists:', existing.email);
      return;
    }
    
    // Create test member
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    const member = await prisma.member.create({
      data: {
        email: 'test.member@peerbond.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Member',
        role: 'member',
        isActive: true,
        recoveryGoals: JSON.stringify(['stress management', 'anxiety support']),
        wellnessGoals: JSON.stringify(['mindfulness', 'better sleep']),
        experienceLevel: 'intermediate'
      }
    });
    
    console.log('✅ Created test member:');
    console.log('   Email:', member.email);
    console.log('   Password: testpass123');
    console.log('   Role:', member.role);
    console.log('   ID:', member.id);
    
  } catch (error) {
    console.error('❌ Error creating test member:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMember();