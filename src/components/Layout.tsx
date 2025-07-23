import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-16">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;