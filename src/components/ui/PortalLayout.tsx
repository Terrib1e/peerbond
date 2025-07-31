import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import MayaQuickAccess from '@/components/ui/MayaQuickAccess';
import { cn } from '@/utils/cn';

interface PortalLayoutProps {
  children: React.ReactNode;
  portalType: 'member' | 'therapist' | 'admin';
  title: string;
  subtitle?: string;
  navigationItems?: {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    path?: string;
    onClick?: () => void;
  }[];
  headerActions?: React.ReactNode;
  showMaya?: boolean;
  showPortalSwitcher?: boolean;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({
  children,
  portalType,
  title,
  subtitle,
  navigationItems = [],
  headerActions,
  showMaya = true,
  showPortalSwitcher = true,
}) => {
  const location = useLocation();
  const { member, logout } = useAuthStore();

  const portalColors = {
    member: {
      primary: 'blue',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      accent: 'bg-blue-600'
    },
    therapist: {
      primary: 'green',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'bg-green-600'
    },
    admin: {
      primary: 'purple',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      accent: 'bg-purple-600'
    }
  };

  const colors = portalColors[portalType];

  const handlePortalSwitch = (portal: string) => {
    const routes = {
      member: '/app',
      therapist: '/therapist',
      admin: '/admin',
      maya: '/maya'
    };
    window.location.href = routes[portal as keyof typeof routes] || '/app';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Switcher for privileged members */}
      {showPortalSwitcher && (member?.role === 'admin' || member?.role === 'therapist') && (
        <div className={cn('border-b px-4 py-2', colors.bg, colors.border)}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <span className={cn('text-sm', colors.text)}>
                Currently in: <strong>{title}</strong>
              </span>
              {showMaya && (
                <Link
                  to="/maya"
                  className="text-xs text-pink-600 hover:text-pink-800 font-medium flex items-center gap-1"
                >
                  <Heart className="w-3 h-3" />
                  Maya AI
                </Link>
              )}
            </div>
            <select
              title="Switch Portal"
              className={cn(
                'px-2 py-1 text-xs border rounded bg-white focus:ring-2 focus:border-transparent',
                `focus:ring-${colors.primary}-500`,
                colors.border
              )}
              onChange={(e) => handlePortalSwitch(e.target.value)}
              value={portalType}
            >
              <option value="member">User Portal</option>
              {member?.role === 'therapist' && <option value="therapist">Therapist Portal</option>}
              {member?.role === 'admin' && <option value="admin">Admin Portal</option>}
              <option value="maya">Maya AI</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-4">
              {headerActions}
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (for tabbed interfaces) */}
      {navigationItems.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex border-b border-gray-200">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? location.pathname.startsWith(item.path) : false;

                const handleClick = () => {
                  if (item.onClick) {
                    item.onClick();
                  }
                };

                const content = (
                  <button
                    key={item.key}
                    onClick={handleClick}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2',
                      isActive
                        ? `border-${colors.primary}-600 text-${colors.primary}-600`
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    )}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );

                return item.path ? (
                  <Link key={item.key} to={item.path}>
                    {content}
                  </Link>
                ) : content;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        'max-w-7xl mx-auto px-4 py-6',
        portalType === 'member' && 'pb-20' // Extra bottom padding for mobile navigation
      )}>
        {children}
      </main>

      {/* Member Portal Bottom Navigation */}
      {portalType === 'member' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex justify-around items-center h-16">
            {[
              { path: '/app', icon: 'Home', label: 'Home' },
              { path: '/app/groups', icon: 'Users', label: 'Groups' },
              { path: '/app/sessions', icon: 'Calendar', label: 'Sessions' },
              { path: '/app/profile', icon: 'User', label: 'Profile' },
            ].map((item) => {
              // This is a simplified version - the actual Navigation component would be imported here
              return (
                <div key={item.path} className="flex flex-col items-center justify-center px-3 py-2">
                  <span className="text-xs mt-1">{item.label}</span>
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* Maya Quick Access (if enabled) */}
      {showMaya && member && !window.location.pathname.includes('/maya') && (
        <MayaQuickAccess
          member={member}
          position="bottom-right"
          showLabel={false}
        />
      )}
    </div>
  );
};

export default PortalLayout;