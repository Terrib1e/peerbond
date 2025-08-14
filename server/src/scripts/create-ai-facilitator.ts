import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAIFacilitator() {
  try {
    // Check if AI facilitator already exists
    const existingAI = await prisma.member.findUnique({
      where: { id: 'ai-facilitator' }
    });

    if (existingAI) {
      console.log('✅ AI Facilitator already exists');
      return existingAI;
    }

    // Create a hashed password (won't be used for login)
    const hashedPassword = await bcrypt.hash('AI_FACILITATOR_NO_LOGIN_' + Date.now(), 10);

    // Create the AI facilitator member
    const aiFacilitator = await prisma.member.create({
      data: {
        id: 'ai-facilitator',
        email: 'maya@peerbond.ai',
        firstName: 'Maya',
        lastName: 'AI Facilitator',
        password: hashedPassword,
        role: 'therapist', // Give it therapist role for permissions
        isActive: true,
        isPremium: true, // AI facilitator has premium features
        experienceLevel: 'expert',
        recoveryGoals: JSON.stringify({
          isSystemAccount: true,
          purpose: 'AI Therapeutic Facilitator',
          capabilities: ['crisis_support', 'group_facilitation', 'therapeutic_guidance']
        }),
        wellnessGoals: JSON.stringify({
          aiType: 'facilitator',
          model: 'GPT-4o',
          description: 'I am Maya, your AI-powered therapeutic facilitator.'
        }),
        avatar: null
      }
    });

    console.log('✅ AI Facilitator created successfully:', aiFacilitator.id);
    return aiFacilitator;
  } catch (error) {
    console.error('❌ Error creating AI Facilitator:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAIFacilitator()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });