/**
 * Maya Quick Access - Floating action button and modal for quick Maya access
 * Can be embedded anywhere in the app for instant Maya support
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  X,
  Bot,
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import MayaInterface from '../ai/MayaInterface';
import MayaTherapistInterface from '../ai/MayaTherapistInterface';
import { Button } from './Button';
import { cn } from '@/utils/cn';

interface MayaQuickAccessProps {
  member: {
    id: string;
    firstName: string;
    role: 'member' | 'therapist' | 'admin';
  };
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
  theme?: 'purple' | 'blue' | 'green';
}

const POSITION_CLASSES = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6'
};

const THEME_COLORS = {
  purple: {
    bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
    hover: 'hover:from-purple-600 hover:to-pink-600',
    text: 'text-white'
  },
  blue: {
    bg: 'bg-gradient-to-r from-blue-500 to-purple-500',
    hover: 'hover:from-blue-600 hover:to-purple-600',
    text: 'text-white'
  },
  green: {
    bg: 'bg-gradient-to-r from-green-500 to-blue-500',
    hover: 'hover:from-green-600 hover:to-blue-600',
    text: 'text-white'
  }
};

export default function MayaQuickAccess({
  member,
  position = 'bottom-right',
  className,
  disabled = false,
  showLabel = false,
  theme = 'purple'
}: MayaQuickAccessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [mayaKey, setMayaKey] = useState(0); // Used to force Maya interface remount

  const themeConfig = THEME_COLORS[theme];
  const positionClass = POSITION_CLASSES[position];

  const handleToggleModal = () => {
    if (disabled) {
      toast.error('Maya is currently unavailable');
      return;
    }

    setIsOpen(!isOpen);
    if (hasNotification) {
      setHasNotification(false);
    }
  };

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleNewChat = () => {
    setMayaKey(prev => prev + 1); // Force Maya interface to remount with fresh session
    toast.success('Started a new conversation with Maya');
  };

  // Simulate receiving a notification (for demo purposes)
  const simulateNotification = () => {
    if (!isOpen) {
      setHasNotification(true);
      toast.success('Maya has a message for you!');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className={cn(
          'fixed z-50',
          positionClass,
          className
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {/* Notification indicator */}
          {hasNotification && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center z-10"
            >
              <span className="text-white text-xs font-bold">1</span>
            </motion.div>
          )}

          {/* Main button */}
          <Button
            onClick={handleToggleModal}
            disabled={disabled}
            className={cn(
              'w-14 h-14 rounded-full shadow-lg transition-all duration-200',
              themeConfig.bg,
              themeConfig.hover,
              themeConfig.text,
              'border-0 p-0',
              disabled && 'opacity-50 cursor-not-allowed',
              showLabel && 'rounded-r-none pr-2'
            )}
          >
            <Heart className="w-6 h-6" />
          </Button>

          {/* Optional label */}
          {showLabel && (
            <div className={cn(
              'absolute left-14 top-0 h-14 px-4 flex items-center rounded-r-full shadow-lg',
              themeConfig.bg,
              themeConfig.text
            )}>
              <span className="text-sm font-medium whitespace-nowrap">
                Chat with Maya
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-2 bg-black bg-opacity-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={cn(
                'bg-white rounded-lg shadow-2xl flex flex-col',
                isExpanded
                  ? 'w-full h-full max-w-none max-h-none'
                  : 'w-full max-w-5xl h-[calc(100vh-4rem)]',
                'overflow-hidden'
              )}
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    themeConfig.bg
                  )}>
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {member.role === 'therapist' || member.role === 'admin' ? 'Maya Clinical Assistant' : 'Maya AI'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {member.role === 'therapist' || member.role === 'admin'
                        ? 'Professional therapeutic support'
                        : 'Your therapeutic companion'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="text-gray-600 hover:text-gray-900"
                    title="Start new conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleExpanded}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseModal}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden">
                {member.role === 'therapist' || member.role === 'admin' ? (
                  <MayaTherapistInterface
                    key={mayaKey} // Forces remount when key changes
                    therapistId={member.id}
                    className="h-full"
                    mode="general"
                  />
                ) : (
                  <MayaInterface
                    key={mayaKey} // Forces remount when key changes
                    memberId={member.id}
                    className="h-full"
                    compact={false}
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 border-t bg-gray-50 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>AI-powered therapeutic support</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => window.open('/maya', '_blank')}
                      className="hover:text-gray-900 transition-colors"
                    >
                      Open in full page
                    </button>
                    <span>•</span>
                    <span>Not a replacement for professional care</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Development helper button (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <motion.button
          onClick={simulateNotification}
          className={cn(
            'fixed bottom-20 right-6 px-3 py-1 bg-gray-800 text-white text-xs rounded',
            'opacity-50 hover:opacity-100 transition-opacity'
          )}
        >
          Test Notification
        </motion.button>
      )}
    </>
  );
}

/**
 * Hook for managing Maya Quick Access state across the app
 */
export function useMayaQuickAccess() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const showNotification = (message?: string) => {
    setNotificationCount(prev => prev + 1);
    if (message) {
      toast.success(message);
    }
  };

  const clearNotifications = () => {
    setNotificationCount(0);
  };

  const setMayaAvailability = (available: boolean) => {
    setIsAvailable(available);
  };

  return {
    isAvailable,
    notificationCount,
    showNotification,
    clearNotifications,
    setMayaAvailability
  };
}

/**
 * Maya Quick Access variants for different use cases
 */
export const MayaQuickAccessCompact = (props: Omit<MayaQuickAccessProps, 'showLabel'>) => (
  <MayaQuickAccess {...props} showLabel={false} />
);

export const MayaQuickAccessWithLabel = (props: Omit<MayaQuickAccessProps, 'showLabel'>) => (
  <MayaQuickAccess {...props} showLabel={true} />
);

export const MayaQuickAccessTherapist = (props: MayaQuickAccessProps) => (
  <MayaQuickAccess {...props} theme="blue" />
);

export const MayaQuickAccessAdmin = (props: MayaQuickAccessProps) => (
  <MayaQuickAccess {...props} theme="green" />
);