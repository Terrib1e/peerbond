/**
 * Check groups in database directly
 */

const { PrismaClient } = require('../../node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkGroups() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: true
      }
    });
    
    console.log(`Found ${groups.length} groups in database:`);
    
    groups.forEach(group => {
      console.log(`\n- ${group.name} (${group.type})`);
      console.log(`  Active: ${group.isActive}`);
      console.log(`  Private: ${group.isPrivate}`);
      console.log(`  Members: ${group.members.length}/${group.maxMembers}`);
      console.log(`  ID: ${group.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGroups();