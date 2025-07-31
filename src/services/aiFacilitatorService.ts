import { Message, Member, ActionItem, Insight } from '@/types';

export interface FacilitatorPrompt {
  type: 'welcome' | 'check_in' | 'redirect' | 'encourage' | 'summarize' | 'action_item';
  context: {
    groupType: string;
    recentMessages: Message[];
    activeMembers: Member[];
    sessionLength: number;
    lastActivity: Date;
  };
}

export interface FacilitatorResponse {
  message: string;
  actionItems?: ActionItem[];
  insights?: Insight[];
  suggestedFollowUp?: string;
}

export class AIFacilitatorService {
  private static readonly FACILITATOR_PERSONALITIES = {
    supportive: {
      name: 'Maya',
      style: 'warm, encouraging, and patient - powered by Gemini 2.0 Flash',
      prompts: {
        welcome: "Welcome everyone! I'm Maya, your AI facilitator powered by advanced AI. I'm here to help guide our conversation and make sure everyone feels heard.",
        checkIn: "How is everyone feeling today? Remember, sharing what you're comfortable with is perfectly fine.",
        encourage: "That takes courage to share. Thank you for being vulnerable with the group.",
      }
    },
    challenging: {
      name: 'Alex',
      style: 'direct, goal-oriented, and motivating',
      prompts: {
        welcome: "Let's make this session count. What specific goals do we want to work on today?",
        checkIn: "What concrete steps have you taken since our last session?",
        encourage: "I can hear the strength in your words. What's your next move?",
      }
    },
    neutral: {
      name: 'Sam',
      style: 'balanced, observant, and structured',
      prompts: {
        welcome: "Good to see everyone. Let's start with a brief check-in and then focus on our main topic.",
        checkIn: "Let's go around and share where we are today - no pressure, just authentic sharing.",
        encourage: "I notice the group is really listening to each other. That's the foundation of good support.",
      }
    },
  };

  static async generateResponse(prompt: FacilitatorPrompt): Promise<FacilitatorResponse> {
    const personality = this.FACILITATOR_PERSONALITIES.supportive;

    switch (prompt.type) {
      case 'welcome':
        return this.generateWelcomeMessage(prompt, personality);

      case 'check_in':
        return this.generateCheckInPrompt(prompt, personality);

      case 'redirect':
        return this.generateRedirectMessage(prompt, personality);

      case 'encourage':
        return this.generateEncouragement(prompt, personality);

      case 'summarize':
        return this.generateSummary(prompt, personality);

      case 'action_item':
        return this.generateActionItem(prompt, personality);

      default:
        return {
          message: "I'm here to support our group discussion. What would you like to talk about?",
        };
    }
  }

  static analyzeGroupDynamics(messages: Message[], members: Member[]): Insight[] {
    const insights: Insight[] = [];
    const now = new Date();

    const participationRates = this.calculateParticipationRates(messages, members);
    const sentimentTrends = this.analyzeSentimentTrends(messages);
    const engagementPatterns = this.analyzeEngagementPatterns(messages);

    if (participationRates.low.length > 0) {
      insights.push({
        id: Date.now().toString(),
        groupId: messages[0]?.groupId || '',
        title: 'Low Participation Alert',
        description: `${participationRates.low.length} member(s) haven't participated recently`,
        category: 'concern',
        generatedAt: now,
        relevantMembers: participationRates.low,
      });
    }

    if (sentimentTrends.improving) {
      insights.push({
        id: (Date.now() + 1).toString(),
        groupId: messages[0]?.groupId || '',
        title: 'Positive Momentum',
        description: 'Group sentiment has been improving over the past week',
        category: 'progress',
        generatedAt: now,
        relevantMembers: [],
      });
    }

    if (engagementPatterns.highSupport) {
      insights.push({
        id: (Date.now() + 2).toString(),
        groupId: messages[0]?.groupId || '',
        title: 'Strong Mutual Support',
        description: 'Members are actively supporting each other through difficult moments',
        category: 'milestone',
        generatedAt: now,
        relevantMembers: [],
      });
    }

    return insights;
  }

  static generateActionItems(messages: Message[], _groupType: string): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const recentMessages = messages.slice(-10);
    const mentionedChallenges = this.extractChallenges(recentMessages);
    const mentionedGoals = this.extractGoals(recentMessages);

    if (mentionedChallenges.includes('sleep')) {
      actionItems.push({
        id: Date.now().toString(),
        groupId: messages[0]?.groupId || '',
        assignedTo: 'group',
        description: 'Try the 4-7-8 breathing technique before bed for better sleep',
        dueDate: nextWeek,
        status: 'pending',
        createdBy: 'ai',
        createdAt: now,
      });
    }

    if (mentionedGoals.includes('exercise')) {
      actionItems.push({
        id: (Date.now() + 1).toString(),
        groupId: messages[0]?.groupId || '',
        assignedTo: 'group',
        description: 'Share one form of movement you enjoyed this week',
        dueDate: nextWeek,
        status: 'pending',
        createdBy: 'ai',
        createdAt: now,
      });
    }

    return actionItems;
  }

  static shouldInterject(messages: Message[], lastInterjection: Date): boolean {
    const recentMessages = messages.filter(m => m.timestamp > lastInterjection);
    const nonAIMessages = recentMessages.filter(m => m.type === 'member');

    if (nonAIMessages.length >= 5) return true;

    const silenceDuration = Date.now() - Math.max(...recentMessages.map(m => m.timestamp.getTime()));
    if (silenceDuration > 10 * 60 * 1000) return true;

    const negativeLanguage = this.detectNegativeLanguage(nonAIMessages);
    if (negativeLanguage.length > 2) return true;

    return false;
  }

  private static generateWelcomeMessage(prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const groupTypeMessages = {
      recovery: "Welcome to our recovery support session. This is a safe space for sharing and growth.",
      anxiety: "Welcome everyone. Let's create a calm, supportive environment for our discussion.",
      depression: "Good to see everyone here. Remember, showing up is an act of courage.",
      general: "Welcome to our support group. Let's focus on lifting each other up today.",
    };

    const message = groupTypeMessages[prompt.context.groupType as keyof typeof groupTypeMessages] ||
                   _personality.prompts.welcome;

    return {
      message,
      suggestedFollowUp: "How would you like to begin today's session?",
    };
  }

  private static generateCheckInPrompt(_prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const messages = [
      "Let's start with a quick check-in. How is everyone feeling right now?",
      "What's been on your mind since we last connected?",
      "On a scale of 1-10, how are you managing today?",
      "What's one thing you're grateful for today?",
    ];

    return {
      message: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  private static generateRedirectMessage(_prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const messages = [
      "I appreciate everyone's engagement. Let's make sure we're creating space for everyone to share.",
      "That's an important point. How does that relate to what others have shared?",
      "Let's pause here and see if anyone else has thoughts on this topic.",
      "I notice we've been focused on one area. Are there other perspectives we should consider?",
    ];

    return {
      message: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  private static generateEncouragement(_prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const messages = [
      "Thank you for sharing that vulnerability with us. That takes real courage.",
      "I can hear the strength in your voice, even when discussing difficult topics.",
      "Your honesty is helping create a safe space for everyone.",
      "It's clear you're putting in the work. That's something to be proud of.",
    ];

    return {
      message: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  private static generateSummary(prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const themes = this.extractCommonThemes(prompt.context.recentMessages);
    const insights = this.analyzeGroupDynamics(prompt.context.recentMessages, prompt.context.activeMembers);

    return {
      message: `Let me summarize what I've heard today: ${themes.join(', ')}. The group has shown great support for each other.`,
      insights,
      suggestedFollowUp: "What's one takeaway you want to carry forward from today's session?",
    };
  }

  private static generateActionItem(prompt: FacilitatorPrompt, _personality: any): FacilitatorResponse {
    const actionItems = this.generateActionItems(prompt.context.recentMessages, prompt.context.groupType);

    return {
      message: "Based on our discussion, I'd like to suggest some action items for the group.",
      actionItems,
    };
  }

  private static calculateParticipationRates(messages: Message[], members: Member[]) {
    const memberMessageCounts = new Map<string, number>();
    const recentMessages = messages.filter(m => m.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    members.forEach(member => memberMessageCounts.set(member.id, 0));
    recentMessages.forEach(msg => {
      if (msg.type === 'member') {
        memberMessageCounts.set(msg.memberId, (memberMessageCounts.get(msg.memberId) || 0) + 1);
      }
    });

    const avgParticipation = Array.from(memberMessageCounts.values()).reduce((a, b) => a + b, 0) / members.length;

    return {
      low: members.filter(u => (memberMessageCounts.get(u.id) || 0) < avgParticipation * 0.5).map(u => u.id),
      high: members.filter(u => (memberMessageCounts.get(u.id) || 0) > avgParticipation * 1.5).map(u => u.id),
    };
  }

  private static analyzeSentimentTrends(messages: Message[]) {
    const positiveWords = ['better', 'good', 'happy', 'progress', 'improvement', 'grateful', 'strong'];
    const negativeWords = ['difficult', 'hard', 'struggle', 'pain', 'worry', 'scared', 'overwhelmed'];

    const recentMessages = messages.filter(m => m.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const olderMessages = messages.filter(m => m.timestamp <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const recentSentiment = this.calculateSentimentScore(recentMessages, positiveWords, negativeWords);
    const olderSentiment = this.calculateSentimentScore(olderMessages, positiveWords, negativeWords);

    return {
      improving: recentSentiment > olderSentiment,
      declining: recentSentiment < olderSentiment,
      stable: Math.abs(recentSentiment - olderSentiment) < 0.1,
    };
  }

  private static calculateSentimentScore(messages: Message[], positiveWords: string[], negativeWords: string[]): number {
    let score = 0;
    let totalWords = 0;

    messages.forEach(msg => {
      if (msg.type === 'member') {
        const words = msg.content.toLowerCase().split(/\s+/);
        totalWords += words.length;

        words.forEach(word => {
          if (positiveWords.includes(word)) score += 1;
          if (negativeWords.includes(word)) score -= 1;
        });
      }
    });

    return totalWords > 0 ? score / totalWords : 0;
  }

  private static analyzeEngagementPatterns(messages: Message[]) {
    const recentMessages = messages.filter(m => m.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const reactions = recentMessages.reduce((acc, msg) => acc + (msg.reactions?.length || 0), 0);

    return {
      highSupport: reactions > recentMessages.length * 0.5,
      activeDiscussion: recentMessages.length > 20,
      consistentParticipation: new Set(recentMessages.map(m => m.memberId)).size > 3,
    };
  }

  private static extractCommonThemes(_messages: Message[]): string[] {
    const themes = ['coping strategies', 'progress updates', 'challenges', 'support sharing'];
    return themes.slice(0, 2);
  }

  private static extractChallenges(messages: Message[]): string[] {
    const challenges: string[] = [];
    const challengeKeywords = {
      sleep: ['sleep', 'tired', 'insomnia', 'rest'],
      anxiety: ['anxious', 'worried', 'panic', 'stress'],
      depression: ['sad', 'down', 'hopeless', 'empty'],
      social: ['lonely', 'isolated', 'alone', 'disconnected'],
    };

    messages.forEach(msg => {
      if (msg.type === 'member') {
        const content = msg.content.toLowerCase();
        Object.entries(challengeKeywords).forEach(([challenge, keywords]) => {
          if (keywords.some(keyword => content.includes(keyword))) {
            challenges.push(challenge);
          }
        });
      }
    });

    return [...new Set(challenges)];
  }

  private static extractGoals(messages: Message[]): string[] {
    const goals: string[] = [];
    const goalKeywords = {
      exercise: ['exercise', 'workout', 'walk', 'gym', 'fitness'],
      meditation: ['meditate', 'mindfulness', 'breathe', 'calm'],
      social: ['friends', 'family', 'social', 'connection'],
      work: ['job', 'career', 'work', 'productivity'],
    };

    messages.forEach(msg => {
      if (msg.type === 'member') {
        const content = msg.content.toLowerCase();
        Object.entries(goalKeywords).forEach(([goal, keywords]) => {
          if (keywords.some(keyword => content.includes(keyword))) {
            goals.push(goal);
          }
        });
      }
    });

    return [...new Set(goals)];
  }

  private static detectNegativeLanguage(messages: Message[]): string[] {
    const negativePatterns = [
      'give up', 'hopeless', 'can\'t do this', 'worthless', 'failure',
      'want to die', 'hurt myself', 'nobody cares', 'pointless'
    ];

    const detected: string[] = [];
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      negativePatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          detected.push(pattern);
        }
      });
    });

    return detected;
  }
}