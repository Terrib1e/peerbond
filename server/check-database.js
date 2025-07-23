const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database content...');

    // Check users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users:`, users.map(u => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName })));

    // Check groups
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });
    console.log(`Found ${groups.length} groups:`, groups.map(g => ({
      id: g.id,
      name: g.name,
      memberCount: g.members.length,
      members: g.members.map(m => m.user.email)
    })));

    // Check group members
    const groupMembers = await prisma.groupMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log(`Found ${groupMembers.length} group members:`, groupMembers.map(gm => ({
      userId: gm.user.email,
      groupName: gm.group.name,
      role: gm.role
    })));

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();