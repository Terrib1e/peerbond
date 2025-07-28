import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Shield,
  BarChart3,
  FileText,
  Activity,
  Brain
} from 'lucide-react';
import { Button } from './ui/Button';

interface PortalLayoutProps {
  portalType: 'admin' | 'therapist' | 'user';
}

/**
 * Shared layout component for different portal types
 */
export default function PortalLayout({ portalType }: PortalLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Portal-specific navigation items
  const getNavItems = () => {
    switch (portalType) {
      case 'admin':
        return [
          { path: '/admin', label: 'Overview', icon: BarChart3 },
          { path: '/admin/users', label: 'Users', icon: Users },
          { path: '/admin/groups', label: 'Groups', icon: MessageSquare },
          { path: '/admin/analytics', label: 'Analytics', icon: Activity },
          { path: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      
      case 'therapist':
        return [
          { path: '/therapist', label: 'Overview', icon: BarChart3 },
          { path: '/therapist/patients', label: 'Patients', icon: Users },
          { path: '/therapist/groups', label: 'Groups', icon: MessageSquare },
          { path: '/therapist/reports', label: 'Reports', icon: FileText },
          { path: '/therapist/ai-insights', label: 'AI Insights', icon: Brain },
        ];
      
      case 'user':
      default:
        return [
          { path: '/app', label: 'Dashboard', icon: Home },
          { path: '/app/groups', label: 'Groups', icon: MessageSquare },
          { path: '/app/ai-tools', label: 'AI Tools', icon: Brain },
          { path: '/app/profile', label: 'Profile', icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  const getPortalTitle = () => {
    switch (portalType) {
      case 'admin': return 'Admin Portal';
      case 'therapist': return 'Therapist Portal';
      case 'user': return 'PeerBond';
    }
  };

  const getPortalIcon = () => {
    switch (portalType) {
      case 'admin': return Shield;
      case 'therapist': return Activity;
      case 'user': return MessageSquare;
    }
  };

  const PortalIcon = getPortalIcon();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Portal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              portalType === 'admin' ? 'bg-red-100' :
              portalType === 'therapist' ? 'bg-blue-100' : 'bg-primary-100'
            }`}>
              <PortalIcon className={`w-6 h-6 ${
                portalType === 'admin' ? 'text-red-600' :
                portalType === 'therapist' ? 'text-blue-600' : 'text-primary-600'
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{getPortalTitle()}</h2>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/admin' && item.path !== '/therapist' && item.path !== '/app' && location.pathname.startsWith(item.path));
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? portalType === 'admin' 
                          ? 'bg-red-100 text-red-700'
                          : portalType === 'therapist'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          {/* Portal Switcher */}
          {(user?.role === 'admin' || user?.role === 'therapist') && (
            <div className="mb-3">
              <select
                title="Switch Portal"
                value={portalType}
                onChange={(e) => {
                  const newPortal = e.target.value;
                  if (newPortal === 'admin') navigate('/admin');
                  else if (newPortal === 'therapist') navigate('/therapist');
                  else navigate('/app');
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="user">User Portal</option>
                {user?.role === 'therapist' && <option value="therapist">Therapist Portal</option>}
                {user?.role === 'admin' && <option value="admin">Admin Portal</option>}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}