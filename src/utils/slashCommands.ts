/**
 * Slash Command System for Maya Interface
 * Provides quick access to common actions and tools for members
 */

import { 
  Users, 
  Heart, 
  Target, 
  BarChart3, 
  BookOpen, 
  Sparkles,
  MessageCircle,
  Calendar,
  LifeBuoy,
  HelpCircle,
  Settings,
  Activity,
  Brain,
  Shield,
  TrendingUp
} from 'lucide-react';

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'support' | 'groups' | 'progress' | 'tools' | 'help';
  prompt: string;
  keywords: string[];
  requiresInput?: boolean;
  inputPlaceholder?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Support Commands
  {
    command: '/help',
    label: 'Get Help',
    description: 'List all available commands and features',
    icon: HelpCircle,
    category: 'help',
    prompt: 'Show me all available commands and how to use Maya effectively',
    keywords: ['help', 'commands', 'how to', 'guide', 'tutorial']
  },
  {
    command: '/crisis',
    label: 'Crisis Support',
    description: 'Get immediate crisis support and resources',
    icon: LifeBuoy,
    category: 'support',
    prompt: 'I need immediate crisis support and resources',
    keywords: ['crisis', 'emergency', 'urgent', 'help now', 'suicide']
  },
  {
    command: '/talk',
    label: 'Talk About Feelings',
    description: 'Express what you\'re feeling right now',
    icon: MessageCircle,
    category: 'support',
    prompt: 'I need to talk about how I\'m feeling',
    keywords: ['talk', 'feelings', 'express', 'share', 'vent'],
    requiresInput: true,
    inputPlaceholder: 'What\'s on your mind?'
  },
  {
    command: '/validate',
    label: 'Validate My Feelings',
    description: 'Get validation and understanding for your emotions',
    icon: Heart,
    category: 'support',
    prompt: 'I need validation for what I\'m going through',
    keywords: ['validate', 'understand', 'normal', 'okay'],
    requiresInput: true,
    inputPlaceholder: 'What are you feeling?'
  },
  
  // Group Commands
  {
    command: '/groups',
    label: 'Find Support Groups',
    description: 'Search for peer support groups that match your needs',
    icon: Users,
    category: 'groups',
    prompt: 'Help me find support groups that match my needs',
    keywords: ['groups', 'support', 'peers', 'community', 'find']
  },
  {
    command: '/join',
    label: 'Join a Group',
    description: 'Get recommendations for groups to join',
    icon: Users,
    category: 'groups',
    prompt: 'Recommend support groups I should join based on my profile',
    keywords: ['join', 'recommend', 'suggest', 'match']
  },
  
  // Progress Commands
  {
    command: '/progress',
    label: 'View My Progress',
    description: 'See your mental health journey and achievements',
    icon: BarChart3,
    category: 'progress',
    prompt: 'Show me my mental health progress and achievements',
    keywords: ['progress', 'journey', 'achievements', 'growth', 'improvement']
  },
  {
    command: '/goals',
    label: 'Set Wellness Goals',
    description: 'Create or review your wellness goals',
    icon: Target,
    category: 'progress',
    prompt: 'Help me set wellness goals for my mental health',
    keywords: ['goals', 'targets', 'objectives', 'wellness', 'plan']
  },
  {
    command: '/mood',
    label: 'Log My Mood',
    description: 'Track how you\'re feeling today',
    icon: Activity,
    category: 'progress',
    prompt: 'I want to log my current mood',
    keywords: ['mood', 'feeling', 'emotion', 'track', 'log'],
    requiresInput: true,
    inputPlaceholder: 'How are you feeling? (1-10)'
  },
  {
    command: '/insights',
    label: 'Get Insights',
    description: 'Analyze patterns in your mental health journey',
    icon: Brain,
    category: 'progress',
    prompt: 'Show me insights and patterns from my mental health journey',
    keywords: ['insights', 'patterns', 'analysis', 'trends', 'understand']
  },
  
  // Tools Commands
  {
    command: '/exercise',
    label: 'Mindfulness Exercise',
    description: 'Get a therapeutic or mindfulness exercise',
    icon: Sparkles,
    category: 'tools',
    prompt: 'Guide me through a mindfulness or therapeutic exercise',
    keywords: ['exercise', 'mindfulness', 'meditation', 'breathing', 'relax']
  },
  {
    command: '/coping',
    label: 'Coping Strategies',
    description: 'Get personalized coping strategies',
    icon: Shield,
    category: 'tools',
    prompt: 'Suggest coping strategies for what I\'m dealing with',
    keywords: ['coping', 'strategies', 'techniques', 'manage', 'deal'],
    requiresInput: true,
    inputPlaceholder: 'What are you struggling with?'
  },
  {
    command: '/learn',
    label: 'Learn About Mental Health',
    description: 'Educational resources and information',
    icon: BookOpen,
    category: 'tools',
    prompt: 'Teach me about mental health topics',
    keywords: ['learn', 'education', 'resources', 'understand', 'information'],
    requiresInput: true,
    inputPlaceholder: 'What topic interests you?'
  },
  {
    command: '/action',
    label: 'Create Action Item',
    description: 'Set a therapeutic task or reminder',
    icon: Calendar,
    category: 'tools',
    prompt: 'Help me create an action item for my wellness',
    keywords: ['action', 'task', 'reminder', 'todo', 'plan'],
    requiresInput: true,
    inputPlaceholder: 'What action do you want to take?'
  },
  {
    command: '/therapist',
    label: 'Find a Therapist',
    description: 'Get help finding professional support',
    icon: Heart,
    category: 'support',
    prompt: 'Help me find a licensed therapist',
    keywords: ['therapist', 'counselor', 'professional', 'therapy', 'psychologist']
  }
];

/**
 * Get commands filtered by search query
 */
export function searchCommands(query: string): SlashCommand[] {
  if (!query || query === '/') {
    return SLASH_COMMANDS;
  }

  const searchTerm = query.toLowerCase().replace('/', '');
  
  return SLASH_COMMANDS.filter(cmd => {
    // Check command name
    if (cmd.command.toLowerCase().includes(searchTerm)) return true;
    
    // Check label
    if (cmd.label.toLowerCase().includes(searchTerm)) return true;
    
    // Check description
    if (cmd.description.toLowerCase().includes(searchTerm)) return true;
    
    // Check keywords
    return cmd.keywords.some(keyword => keyword.includes(searchTerm));
  });
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: SlashCommand['category']): SlashCommand[] {
  return SLASH_COMMANDS.filter(cmd => cmd.category === category);
}

/**
 * Parse command from user input
 */
export function parseCommand(input: string): { command: SlashCommand | null; args: string } {
  const trimmed = input.trim();
  
  if (!trimmed.startsWith('/')) {
    return { command: null, args: '' };
  }
  
  const parts = trimmed.split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  const command = SLASH_COMMANDS.find(cmd => cmd.command === commandName) || null;
  
  return { command, args };
}

/**
 * Format command for display with syntax highlighting
 */
export function formatCommandSyntax(command: SlashCommand): string {
  if (command.requiresInput) {
    return `${command.command} <${command.inputPlaceholder || 'your input'}>`;
  }
  return command.command;
}

/**
 * Get command categories for grouping
 */
export const COMMAND_CATEGORIES = [
  { id: 'support', label: 'Support & Crisis', icon: Heart },
  { id: 'groups', label: 'Groups & Community', icon: Users },
  { id: 'progress', label: 'Progress & Insights', icon: TrendingUp },
  { id: 'tools', label: 'Tools & Exercises', icon: Sparkles },
  { id: 'help', label: 'Help & Info', icon: HelpCircle }
] as const;