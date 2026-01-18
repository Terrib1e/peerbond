/**
 * Check what groups the test member is in
 */

const { PrismaClient } = require('../../node_modules/@prisma/client');

const prisma = new PrismaClient();

async function checkMemberGroups() {
  try {
    const member = await prisma.member.findUnique({
      where: { email: 'test.member@peerbond.com' }
    });
    
    if (!member) {
      console.log('Member not found');
      return;
    }
    
    console.log('Member ID:', member.id);
    
    // Check group memberships
    const memberships = await prisma.groupMember.findMany({
      where: { memberId: member.id },
      include: { group: true }
    });
    
    console.log(`\nMember is in ${memberships.length} groups via groupMember table:`);
    memberships.forEach(m => {
      console.log(`- ${m.group.name} (${m.role})`);
    });
    
    // Check group assignments
    const assignments = await prisma.groupAssignment.findMany({
      where: { 
        memberId: member.id,
        isActive: true 
      },
      include: { group: true }
    });
    
    console.log(`\nMember has ${assignments.length} active group assignments:`);
    assignments.forEach(a => {
      console.log(`- ${a.group.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemberGroups();