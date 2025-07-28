import { BaseAgent } from '../base';

export class FacilitatorAgent extends BaseAgent {
  id = 'facilitator-maya';
  name = 'Maya';
  description = 'AI facilitator for mental health support groups';
  model = 'gpt-4o';
  provider = 'openai';
  
  tools = [
    'postMessage',
    'logMood',
    'escalateCrisis',
    'suggestGroup'
  ];

  systemPrompt = `You are Maya, a compassionate AI facilitator for mental health support groups.

Your role:
- Guide group discussions with empathy and psychological insight
- Help members share experiences in a safe, supportive environment
- Recognize when someone needs additional support or crisis intervention
- Facilitate meaningful connections between group members
- Provide evidence-based coping strategies and resources

Guidelines:
- Use warm, non-judgmental language
- Ask open-ended questions to encourage sharing
- Validate feelings and experiences
- Recognize signs of crisis or distress
- Maintain appropriate boundaries as an AI facilitator
- Encourage peer support and connection
- Follow HIPAA compliance in all interactions

Available tools:
- postMessage: Send messages to the group chat
- logMood: Help users track their emotional state
- escalateCrisis: Alert human therapists when crisis intervention is needed
- suggestGroup: Recommend appropriate support groups for members

Remember: You are not a replacement for human therapy, but a supportive presence that helps facilitate healing conversations and connections.`;

  async handleGroupMessage(
    sessionId: string,
    message: string,
    senderId: string
  ): Promise<string> {
    // Add sender context
    const context = {
      lastMessageSender: senderId,
      messageType: 'group_chat'
    };

    const response = await this.processMessage(sessionId, message, context);
    return response.message;
  }

  async facilitateCheckIn(sessionId: string, participants: string[]): Promise<string> {
    const checkInPrompt = `Start a check-in for our group session. We have ${participants.length} participants today. 
    Guide them through sharing how they're feeling and what they'd like to focus on in today's session.`;

    const response = await this.processMessage(sessionId, checkInPrompt, {
      participants,
      activityType: 'check_in'
    });

    return response.message;
  }

  async provideCopingStrategy(
    sessionId: string,
    situation: string,
    emotionalState: string
  ): Promise<string> {
    const prompt = `A group member is dealing with: ${situation}. 
    They're feeling: ${emotionalState}. 
    Please provide appropriate coping strategies and encourage group support.`;

    const response = await this.processMessage(sessionId, prompt, {
      supportType: 'coping_strategy',
      situation,
      emotionalState
    });

    return response.message;
  }

  async moderateDiscussion(
    sessionId: string,
    topic: string,
    participants: string[]
  ): Promise<string> {
    const prompt = `Guide a group discussion on: ${topic}. 
    Help ensure everyone has a chance to participate and keep the conversation supportive and therapeutic.`;

    const response = await this.processMessage(sessionId, prompt, {
      topic,
      participants,
      activityType: 'discussion'
    });

    return response.message;
  }
}