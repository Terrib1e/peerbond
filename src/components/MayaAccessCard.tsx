/**
 * Maya Access Card - Reusable card component for accessing Maya AI
 * Can be used in dashboards, pages, or any interface where Maya access is needed
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Bot,
  Stethoscope,
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface MayaAccessCardProps {
  memberRole: 'member' | 'therapist' | 'admin';
  className?: string;
  variant?: 'compact' | 'full' | 'hero';
  context?: {
    groupId?: string;
    clientId?: string;
    sessionId?: string;
  };
}

const ROLE_CONFIGS = {
  member: {
    title: 'Chat with Maya',
    subtitle: 'Your AI therapeutic companion',
    description: 'Get personalized support, coping strategies, and peer connections from Maya, your AI mental health companion.',
    icon: Heart,
    color: 'from-purple-500 to-pink-500',
    features: ['24/7 emotional support', 'Personalized coping strategies', 'Peer group recommendations'],
    cta: 'Start conversation'
  },
  therapist: {
    title: 'Maya Clinical Assistant',
    subtitle: 'AI-powered clinical support',
    description: 'Access professional-grade tools for client assessment, treatment planning, and therapeutic guidance.',
    icon: Stethoscope,
    color: 'from-blue-500 to-purple-500',
    features: ['Client assessments', 'Treatment planning', 'Crisis evaluation tools'],
    cta: 'Open clinical interface'
  },
  admin: {
    title: 'Maya System Management',
    subtitle: 'Administrative AI interface',
    description: 'Monitor system health, analyze platform metrics, and manage AI agent performance.',
    icon: Settings,
    color: 'from-green-500 to-blue-500',
    features: ['System monitoring', 'Performance analytics', 'Agent management'],
    cta: 'Access admin tools'
  }
};

export default function MayaAccessCard({
  memberRole,
  className,
  variant = 'full',
  context
}: MayaAccessCardProps) {
  const config = ROLE_CONFIGS[memberRole];
  const Icon = config.icon;

  // Build URL with context parameters
  const buildMayaUrl = () => {
    const baseUrl = '/maya';
    const params = new URLSearchParams();

    if (context?.groupId) params.set('groupId', context.groupId);
    if (context?.clientId) params.set('clientId', context.clientId);
    if (context?.sessionId) params.set('sessionId', context.sessionId);

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  if (variant === 'compact') {
    return (
      <Card className={cn('hover:shadow-lg transition-shadow duration-200', className)}>
        <CardContent className="p-4">
          <Link to={buildMayaUrl()} className="block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
                  config.color
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{config.title}</h3>
                  <p className="text-sm text-gray-600">{config.subtitle}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'hero') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('relative overflow-hidden rounded-2xl p-8 text-white', className)}
        style={{
          background: `linear-gradient(135deg, ${config.color.replace('from-', '').replace('to-', ', ')})`
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Sparkles className="w-full h-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white bg-opacity-20 flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              <p className="text-white text-opacity-90">{config.subtitle}</p>
            </div>
          </div>

          <p className="text-white text-opacity-90 mb-6 text-lg">
            {config.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {config.features.map((feature, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>

          <Link to={buildMayaUrl()}>
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold"
            >
              <Bot className="w-5 h-5 mr-2" />
              {config.cta}
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  // Full variant (default)
  return (
    <Card className={cn('hover:shadow-lg transition-shadow duration-200', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center flex-shrink-0',
            config.color
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {config.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {config.description}
            </p>

            <div className="space-y-2 mb-6">
              {config.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {feature}
                </div>
              ))}
            </div>

            <Link to={buildMayaUrl()}>
              <Button className={cn('w-full bg-gradient-to-r text-white', config.color)}>
                <Bot className="w-4 h-4 mr-2" />
                {config.cta}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Pre-configured variants for specific use cases
 */
export const MayaAccessCardMember = (props: Omit<MayaAccessCardProps, 'memberRole'>) => (
  <MayaAccessCard {...props} memberRole="member" />
);

export const MayaAccessCardTherapist = (props: Omit<MayaAccessCardProps, 'memberRole'>) => (
  <MayaAccessCard {...props} memberRole="therapist" />
);

export const MayaAccessCardAdmin = (props: Omit<MayaAccessCardProps, 'memberRole'>) => (
  <MayaAccessCard {...props} memberRole="admin" />
);