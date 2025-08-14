/**
 * Check specific group details
 */

const { PrismaClient } = require('./server/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkGroup() {
  try {
    const group = await prisma.group.findFirst({
      where: { name: "Anxiety & Stress Management" }
    });
    
    console.log('Anxiety & Stress Management group details:');
    console.log('ID:', group.id);
    console.log('Type:', group.type);
    console.log('isActive:', group.isActive);
    console.log('isPrivate:', group.isPrivate);
    console.log('maxMembers:', group.maxMembers);
    
    // Now test the exact query being run
    const directQuery = await prisma.group.findMany({
      where: {
        type: 'wellness',
        isActive: true,
        isPrivate: false
      }
    });
    
    console.log(`\nDirect query results: ${directQuery.length} groups`);
    directQuery.forEach(g => {
      console.log(`- ${g.name}: type=${g.type}, active=${g.isActive}, private=${g.isPrivate}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGroup();