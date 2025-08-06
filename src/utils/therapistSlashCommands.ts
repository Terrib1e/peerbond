/**
 * Therapist-Specific Slash Command System for Maya Interface
 * Provides quick access to clinical tools and administrative functions
 */

import { 
  Stethoscope, 
  Users, 
  Brain, 
  FileText, 
  AlertTriangle,
  UserPlus,
  Calendar,
  Shield,
  Target,
  TrendingUp,
  ClipboardList,
  UserCheck,
  BookOpen,
  Activity,
  Heart,
  HelpCircle
} from 'lucide-react';

export interface TherapistSlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'clinical' | 'administrative' | 'crisis' | 'documentation' | 'help';
  prompt: string;
  keywords: string[];
  requiresClientId?: boolean;
  inputPlaceholder?: string;
}

export const THERAPIST_SLASH_COMMANDS: TherapistSlashCommand[] = [
  // Clinical Commands
  {
    command: '/assess',
    label: 'Clinical Assessment',
    description: 'Perform comprehensive clinical assessment',
    icon: Stethoscope,
    category: 'clinical',
    prompt: 'Help me conduct a comprehensive clinical assessment for this client',
    keywords: ['assess', 'evaluation', 'diagnosis', 'clinical'],
    requiresClientId: true
  },
  {
    command: '/risk',
    label: 'Risk Assessment',
    description: 'Evaluate crisis and safety risk factors',
    icon: AlertTriangle,
    category: 'crisis',
    prompt: 'Conduct a thorough risk assessment including suicide, self-harm, and violence risk',
    keywords: ['risk', 'crisis', 'safety', 'suicide', 'danger'],
    requiresClientId: true
  },
  {
    command: '/progress',
    label: 'Progress Analysis',
    description: 'Analyze client progress and treatment outcomes',
    icon: TrendingUp,
    category: 'clinical',
    prompt: 'Analyze this client\'s progress and treatment outcomes',
    keywords: ['progress', 'outcomes', 'improvement', 'analysis'],
    requiresClientId: true
  },
  {
    command: '/intervention',
    label: 'Intervention Suggestions',
    description: 'Get evidence-based intervention recommendations',
    icon: Target,
    category: 'clinical',
    prompt: 'Suggest evidence-based therapeutic interventions for this client',
    keywords: ['intervention', 'treatment', 'therapy', 'techniques'],
    requiresClientId: true
  },
  {
    command: '/insights',
    label: 'Clinical Insights',
    description: 'Generate clinical insights and patterns',
    icon: Brain,
    category: 'clinical',
    prompt: 'Provide clinical insights and identify patterns for this client',
    keywords: ['insights', 'patterns', 'analysis', 'understanding'],
    requiresClientId: true
  },
  
  // Administrative Commands
  {
    command: '/onboard',
    label: 'Onboard New Member',
    description: 'Start new member intake and onboarding',
    icon: UserPlus,
    category: 'administrative',
    prompt: 'Help me onboard a new member to the platform',
    keywords: ['onboard', 'new', 'intake', 'member', 'user']
  },
  {
    command: '/creategroup',
    label: 'Create Group',
    description: 'Create a new therapeutic support group',
    icon: Users,
    category: 'administrative',
    prompt: 'Assist me in creating a new therapeutic group',
    keywords: ['create', 'group', 'new', 'support']
  },
  {
    command: '/managegroup',
    label: 'Manage Group',
    description: 'Manage existing group settings and members',
    icon: Users,
    category: 'administrative',
    prompt: 'Help me manage an existing group',
    keywords: ['manage', 'group', 'settings', 'members'],
    requiresClientId: false,
    inputPlaceholder: 'Group name or ID'
  },
  {
    command: '/session',
    label: 'Plan Session',
    description: 'Plan therapeutic sessions and activities',
    icon: Calendar,
    category: 'administrative',
    prompt: 'Help me plan therapeutic sessions',
    keywords: ['session', 'plan', 'schedule', 'activity']
  },
  {
    command: '/members',
    label: 'Member Management',
    description: 'Manage member accounts and permissions',
    icon: UserCheck,
    category: 'administrative',
    prompt: 'Assist with member account management',
    keywords: ['member', 'user', 'account', 'manage', 'permissions']
  },
  
  // Documentation Commands
  {
    command: '/notes',
    label: 'Session Notes',
    description: 'Draft clinical session notes',
    icon: FileText,
    category: 'documentation',
    prompt: 'Help me draft clinical documentation for this session',
    keywords: ['notes', 'documentation', 'session', 'record'],
    requiresClientId: true
  },
  {
    command: '/treatment',
    label: 'Treatment Plan',
    description: 'Create or update treatment plans',
    icon: ClipboardList,
    category: 'documentation',
    prompt: 'Help me create or update a treatment plan',
    keywords: ['treatment', 'plan', 'goals', 'objectives'],
    requiresClientId: true
  },
  
  // Crisis Commands
  {
    command: '/crisis',
    label: 'Crisis Protocol',
    description: 'Activate crisis intervention protocol',
    icon: Shield,
    category: 'crisis',
    prompt: 'Activate crisis intervention protocol and provide immediate guidance',
    keywords: ['crisis', 'emergency', 'urgent', 'immediate']
  },
  {
    command: '/safety',
    label: 'Safety Plan',
    description: 'Create or review safety plan',
    icon: Shield,
    category: 'crisis',
    prompt: 'Help me create or review a safety plan',
    keywords: ['safety', 'plan', 'crisis', 'prevention'],
    requiresClientId: true
  },
  
  // Research and Help
  {
    command: '/research',
    label: 'Research & Evidence',
    description: 'Get current research and best practices',
    icon: BookOpen,
    category: 'clinical',
    prompt: 'Provide current research and evidence-based practices',
    keywords: ['research', 'evidence', 'studies', 'literature'],
    requiresClientId: false,
    inputPlaceholder: 'Topic or diagnosis'
  },
  {
    command: '/help',
    label: 'Help & Commands',
    description: 'List all available therapist commands',
    icon: HelpCircle,
    category: 'help',
    prompt: 'Show me all available therapist commands and features',
    keywords: ['help', 'commands', 'guide', 'how to']
  }
];

/**
 * Get commands filtered by search query
 */
export function searchTherapistCommands(query: string): TherapistSlashCommand[] {
  if (!query || query === '/') {
    return THERAPIST_SLASH_COMMANDS;
  }

  const searchTerm = query.toLowerCase().replace('/', '');
  
  return THERAPIST_SLASH_COMMANDS.filter(cmd => {
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
export function getTherapistCommandsByCategory(category: TherapistSlashCommand['category']): TherapistSlashCommand[] {
  return THERAPIST_SLASH_COMMANDS.filter(cmd => cmd.category === category);
}

/**
 * Parse command from user input
 */
export function parseTherapistCommand(input: string): { command: TherapistSlashCommand | null; args: string } {
  const trimmed = input.trim();
  
  if (!trimmed.startsWith('/')) {
    return { command: null, args: '' };
  }
  
  const parts = trimmed.split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  const command = THERAPIST_SLASH_COMMANDS.find(cmd => cmd.command === commandName) || null;
  
  return { command, args };
}

/**
 * Get command categories for grouping
 */
export const THERAPIST_COMMAND_CATEGORIES = [
  { id: 'clinical', label: 'Clinical Tools', icon: Stethoscope },
  { id: 'administrative', label: 'Administration', icon: Users },
  { id: 'crisis', label: 'Crisis & Safety', icon: AlertTriangle },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'help', label: 'Help & Info', icon: HelpCircle }
] as const;