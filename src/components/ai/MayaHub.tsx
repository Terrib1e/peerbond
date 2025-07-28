/**
 * Maya Hub - Unified interface that provides role-based access to Maya AI
 * Integrates with existing agent system and provides appropriate interface based on user role
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Stethoscope, 
  Settings, 
  User, 
  Shield, 
  ChevronRight,
  Bot,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import MayaInterface from './MayaInterface';
import MayaTherapistInterface from './MayaTherapistInterface';
import MayaAdminInterface from './MayaAdminInterface';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface MayaHubProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'member' | 'therapist' | 'admin';
  };
  context?: {
    groupId?: string;
    sessionId?: string;
    clientId?: string;
  };
  className?: string;
  defaultMode?: 'compact' | 'full' | 'modal';
}

interface InterfaceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  requiredRole: 'member' | 'therapist' | 'admin';
  features: string[];
}

const INTERFACE_OPTIONS: InterfaceOption[] = [
  {
    id: 'basic',
    name: 'Maya Support',
    description: 'Personal therapeutic companion with basic mental health support',
    icon: Heart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    requiredRole: 'member',
    features: [
      'Emotional support and validation',
      'Coping strategy suggestions', 
      'Peer group recommendations',
      'Progress tracking',
      'Crisis support resources',
      'Mental health education'
    ]
  },
  {
    id: 'therapist',
    name: 'Clinical Assistant',
    description: 'Professional tools for therapists with client insights and assessments',
    icon: Stethoscope,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    requiredRole: 'therapist',
    features: [
      'Client assessment tools',
      'Treatment planning assistance',
      'Crisis evaluation protocols',
      'Progress analysis',
      'Evidence-based interventions',
      'Clinical documentation support',
      'Group dynamics analysis'
    ]
  },
  {
    id: 'admin',
    name: 'System Management',
    description: 'Administrative oversight with system analytics and management tools',
    icon: Settings,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    requiredRole: 'admin',
    features: [
      'System health monitoring',
      'Agent performance analytics',
      'User engagement metrics',
      'Security audit tools',
      'Compliance monitoring',
      'Resource optimization',
      'Crisis management oversight'
    ]
  }
];

export default function MayaHub({ user, context, className, defaultMode = 'full' }: MayaHubProps) {
  const [activeInterface, setActiveInterface] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [mayaStatus, setMayaStatus] = useState<'available' | 'degraded' | 'unavailable'>('available');
  const [showInterfaceSelector, setShowInterfaceSelector] = useState(false);

  useEffect(() => {
    initializeMayaHub();
  }, [user.role]);

  const initializeMayaHub = async () => {
    setIsLoading(true);
    
    try {
      // Check Maya system availability
      await checkMayaAvailability();
      
      // Auto-select appropriate interface based on role
      const defaultInterface = getDefaultInterfaceForRole(user.role);
      setActiveInterface(defaultInterface);
      
      // Show interface selector if user has multiple options
      const availableInterfaces = getAvailableInterfaces(user.role);
      setShowInterfaceSelector(availableInterfaces.length > 1);
      
    } catch (error) {
      console.error('Maya Hub initialization error:', error);
      setMayaStatus('unavailable');
      toast.error('Maya system is currently unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMayaAvailability = async (): Promise<void> => {
    // Simulate system health check - in production would ping actual services
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const random = Math.random();
        if (random > 0.9) {
          setMayaStatus('unavailable');
          reject(new Error('System unavailable'));
        } else if (random > 0.7) {
          setMayaStatus('degraded');
          resolve();
        } else {
          setMayaStatus('available');
          resolve();
        }
      }, 1000);
    });
  };

  const getDefaultInterfaceForRole = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'admin';
      case 'therapist':
        return 'therapist';
      case 'member':
      default:
        return 'basic';
    }
  };

  const getAvailableInterfaces = (role: string): InterfaceOption[] => {
    switch (role) {
      case 'admin':
        return INTERFACE_OPTIONS; // Admin can access all interfaces
      case 'therapist':
        return INTERFACE_OPTIONS.filter(opt => ['basic', 'therapist'].includes(opt.id));
      case 'member':
      default:
        return INTERFACE_OPTIONS.filter(opt => opt.id === 'basic');
    }
  };

  const hasAccessToInterface = (interfaceId: string, userRole: string): boolean => {
    const interface_option = INTERFACE_OPTIONS.find(opt => opt.id === interfaceId);
    if (!interface_option) return false;

    const roleHierarchy = {
      'member': 1,
      'therapist': 2,
      'admin': 3
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[interface_option.requiredRole];

    return userLevel >= requiredLevel;
  };

  const switchInterface = (interfaceId: string) => {
    if (!hasAccessToInterface(interfaceId, user.role)) {
      toast.error('You do not have permission to access this interface');
      return;
    }

    setActiveInterface(interfaceId);
    toast.success(`Switched to ${INTERFACE_OPTIONS.find(opt => opt.id === interfaceId)?.name}`);
  };

  const renderStatusIndicator = () => {
    const statusConfig = {
      available: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Available' },
      degraded: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle, label: 'Limited' },
      unavailable: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle, label: 'Unavailable' }
    };

    const config = statusConfig[mayaStatus];
    const Icon = config.icon;

    return (
      <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full', config.bg, config.color)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">Maya {config.label}</span>
      </div>
    );
  };

  const renderInterfaceSelector = () => {
    const availableInterfaces = getAvailableInterfaces(user.role);

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableInterfaces.map(interface_option => {
          const Icon = interface_option.icon;
          const isActive = activeInterface === interface_option.id;
          const hasAccess = hasAccessToInterface(interface_option.id, user.role);

          return (
            <Card
              key={interface_option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-lg',
                isActive ? 'ring-2 ring-blue-500' : '',
                !hasAccess ? 'opacity-50 cursor-not-allowed' : ''
              )}
              onClick={() => hasAccess && switchInterface(interface_option.id)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center',
                    interface_option.bgColor,
                    interface_option.borderColor,
                    'border'
                  )}>
                    <Icon className={cn('w-6 h-6', interface_option.color)} />
                  </div>
                  
                  {isActive && (
                    <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-lg mb-2">{interface_option.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{interface_option.description}</p>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Features:</div>
                  {interface_option.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {feature}
                    </div>
                  ))}
                  {interface_option.features.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{interface_option.features.length - 3} more features
                    </div>
                  )}
                </div>

                {hasAccess && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-500">
                      Role: {interface_option.requiredRole}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}

                {!hasAccess && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <Shield className="w-4 h-4" />
                      Requires {interface_option.requiredRole} role
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderActiveInterface = () => {
    if (!activeInterface) return null;

    const commonProps = {
      className: 'h-full',
      compact: defaultMode === 'compact'
    };

    switch (activeInterface) {
      case 'basic':
        return (
          <MayaInterface
            userId={user.id}
            {...commonProps}
          />
        );
      
      case 'therapist':
        return (
          <MayaTherapistInterface
            therapistId={user.id}
            clientId={context?.clientId}
            sessionId={context?.sessionId}
            {...commonProps}
          />
        );
      
      case 'admin':
        return (
          <MayaAdminInterface
            adminId={user.id}
            {...commonProps}
          />
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Interface Not Found</h3>
              <p className="text-gray-600">The requested Maya interface is not available</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-white', className)}>
        <div className="text-center">
          <Clock className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Initializing Maya</h3>
          <p className="text-gray-600">Setting up your AI companion...</p>
        </div>
      </div>
    );
  }

  if (mayaStatus === 'unavailable') {
    return (
      <div className={cn('flex items-center justify-center h-full bg-white', className)}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Maya Unavailable</h3>
          <p className="text-gray-600 mb-4">
            The Maya AI system is currently unavailable. Please try again later.
          </p>
          <Button 
            onClick={initializeMayaHub}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header with status and interface selector toggle */}
      {(showInterfaceSelector || mayaStatus !== 'available') && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900">Maya AI Hub</span>
            </div>
            {renderStatusIndicator()}
          </div>

          {showInterfaceSelector && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInterfaceSelector(!showInterfaceSelector)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Switch Interface
            </Button>
          )}
        </div>
      )}

      {/* Interface Selector */}
      <AnimatePresence>
        {showInterfaceSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-white p-6"
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Choose Your Maya Experience
              </h2>
              <p className="text-gray-600">
                Select the interface that best fits your role and needs. You can switch between 
                available interfaces at any time.
              </p>
            </div>
            {renderInterfaceSelector()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Interface */}
      <div className="flex-1 overflow-hidden">
        {renderActiveInterface()}
      </div>

      {/* Footer with user context */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{user.firstName} {user.lastName}</span>
            <span className="text-gray-400">•</span>
            <span className="capitalize">{user.role}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {context?.groupId && (
              <span>Group: {context.groupId}</span>
            )}
            {context?.clientId && (
              <span>Client: {context.clientId}</span>
            )}
            <span className="text-xs">
              Interface: {INTERFACE_OPTIONS.find(opt => opt.id === activeInterface)?.name || 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}