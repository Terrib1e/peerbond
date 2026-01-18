/**
 * Check privacy values in database
 */

const { PrismaClient } = require('../../node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkPrivacyValues() {
  try {
    const groups = await prisma.group.findMany({
      select: {
        name: true,
        type: true,
        isActive: true,
        isPrivate: true
      }
    });
    
    console.log('All groups with privacy values:');
    groups.forEach(group => {
      console.log(`${group.name}: active=${group.isActive}, private=${group.isPrivate} (type: ${typeof group.isPrivate})`);
    });
    
    // Check what happens when we filter by isPrivate = false
    const publicGroups = await prisma.group.findMany({
      where: {
        isPrivate: false
      },
      select: {
        name: true,
        isPrivate: true
      }
    });
    
    console.log(`\nGroups with isPrivate = false: ${publicGroups.length}`);
    publicGroups.forEach(group => {
      console.log(`- ${group.name}: ${group.isPrivate}`);
    });
    
    // Check what happens when we filter by isPrivate = null
    const nullPrivacyGroups = await prisma.group.findMany({
      where: {
        isPrivate: null
      },
      select: {
        name: true,
        isPrivate: true
      }
    });
    
    console.log(`\nGroups with isPrivate = null: ${nullPrivacyGroups.length}`);
    nullPrivacyGroups.forEach(group => {
      console.log(`- ${group.name}: ${group.isPrivate}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrivacyValues();