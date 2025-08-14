const { PrismaClient } = require('./server/node_modules/@prisma/client');

async function showDescription() {
  const prisma = new PrismaClient();
  const group = await prisma.group.findFirst({
    where: { name: "Anxiety & Stress Management" }
  });
  
  console.log('Group:', group.name);
  console.log('Description:', `"${group.description}"`);
  console.log('Contains "mental health":', group.description.includes('mental health'));
  console.log('Contains "anxiety":', group.description.includes('anxiety'));
  console.log('Contains "stress":', group.description.includes('stress'));
  
  // Show all wellness groups
  const allWellness = await prisma.group.findMany({
    where: { type: 'wellness' },
    select: { name: true, description: true }
  });
  
  console.log('\nAll wellness groups:');
  allWellness.forEach(g => {
    console.log(`- ${g.name}: "${g.description}"`);
  });
  
  await prisma.$disconnect();
}

showDescription();