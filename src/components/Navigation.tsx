import { Link, useLocation } from 'react-router-dom';
import { Home, Users, User, LogOut, Brain } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function Navigation() {
  const location = useLocation();
  const { logout } = useAuthStore();

  const navItems = [
    { path: '/app', icon: Home, label: 'Home' },
    { path: '/app/groups', icon: Users, label: 'Groups' },
    { path: '/app/ai-tools', icon: Brain, label: 'AI Tools' },
    { path: '/app/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
        >
          <LogOut size={20} />
          <span className="text-xs mt-1">Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navigation;