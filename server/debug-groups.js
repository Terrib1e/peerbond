const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugGroups() {
  try {
    const therapistId = '965ff723-f6fb-4475-a076-a0cd691c8f8e'; // Elijah Clark
    
    console.log('🔍 Debugging group visibility for therapist:', therapistId);
    console.log('');

    // 1. Check all groups in the database
    console.log('📋 All groups in database:');
    const allGroups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        createdBy: true,
        facilitatorId: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    allGroups.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.name}`);
      console.log(`     ID: ${group.id}`);
      console.log(`     Created By: ${group.createdBy}`);
      console.log(`     Facilitator ID: ${group.facilitatorId}`);
      console.log(`     Active: ${group.isActive}`);
      console.log(`     Created: ${group.createdAt}`);
      console.log('');
    });

    // 2. Check groups created by this therapist
    console.log('🏗️ Groups created by this therapist:');
    const createdGroups = await prisma.group.findMany({
      where: {
        createdBy: therapistId,
        isActive: true
      }
    });
    console.log(`Found ${createdGroups.length} groups created by therapist`);
    createdGroups.forEach(group => {
      console.log(`  - ${group.name} (${group.id})`);
    });
    console.log('');

    // 3. Check groups where therapist is facilitator
    console.log('👥 Groups where therapist is facilitator:');
    const facilitatorGroups = await prisma.group.findMany({
      where: {
        facilitatorId: therapistId,
        isActive: true
      }
    });
    console.log(`Found ${facilitatorGroups.length} groups with therapist as facilitator`);
    facilitatorGroups.forEach(group => {
      console.log(`  - ${group.name} (${group.id})`);
    });
    console.log('');

    // 4. Check group memberships for this therapist
    console.log('🎭 Group memberships for this therapist:');
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: therapistId
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });
    console.log(`Found ${memberships.length} group memberships`);
    memberships.forEach(membership => {
      console.log(`  - ${membership.group.name} (role: ${membership.role}, active: ${membership.group.isActive})`);
    });
    console.log('');

    // 5. Test the exact query from the therapist route
    console.log('🔍 Testing therapist groups query:');
    const therapistGroups = await prisma.group.findMany({
      where: {
        isActive: true,
        OR: [
          { createdBy: therapistId },
          { facilitatorId: therapistId },
          {
            members: {
              some: {
                userId: therapistId,
                role: 'facilitator'
              }
            }
          }
        ]
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true
          }
        }
      }
    });

    console.log(`Query returned ${therapistGroups.length} groups`);
    therapistGroups.forEach(group => {
      console.log(`  - ${group.name}`);
      console.log(`    Created By: ${group.createdBy}`);
      console.log(`    Facilitator ID: ${group.facilitatorId}`);
      console.log(`    Members: ${group.members.length}`);
      group.members.forEach(member => {
        console.log(`      - User ${member.userId} (${member.role})`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGroups();