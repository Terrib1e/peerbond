import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Navigation from './Navigation';
import MayaQuickAccess from './ui/MayaQuickAccess';

function Layout() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-16">
        <Outlet />
      </main>
      
      {/* Maya Quick Access - only show if not on Maya page */}
      {user && window.location.pathname !== '/app/maya' && window.location.pathname !== '/maya' && (
        <MayaQuickAccess 
          user={user}
          position="bottom-right"
          showLabel={false}
        />
      )}
    </div>
  );
}

export default Layout;