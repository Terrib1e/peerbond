import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, User, LogOut, Calendar, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { member, logout } = useAuthStore();

  const navItems = [
    { path: '/app', icon: Home, label: 'Home' },
    { path: '/app/groups', icon: Users, label: 'Groups' },
    { path: '/app/sessions', icon: Calendar, label: 'Sessions' },
    { path: '/app/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Top Portal Switcher for privileged members */}
      {(member?.role === 'admin' || member?.role === 'therapist') && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-700">
                Currently in: <strong>Member Portal</strong>
              </span>
              <Link
                to="/maya"
                className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                <Heart className="w-3 h-3" />
                Maya AI
              </Link>
            </div>
            <select
              title="Switch Portal"
              className="px-2 py-1 text-xs border border-blue-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                if (e.target.value === 'admin') navigate('/admin');
                else if (e.target.value === 'therapist') navigate('/therapist');
                else if (e.target.value === 'maya') navigate('/maya');
              }}
            >
              <option value="member">Member Portal</option>
              {member?.role === 'therapist' && <option value="therapist">Therapist Portal</option>}
              {member?.role === 'admin' && <option value="admin">Admin Portal</option>}
              <option value="maya">Maya AI</option>
            </select>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActiveItem = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                  isActiveItem
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
    </>
  );
}

export default Navigation;