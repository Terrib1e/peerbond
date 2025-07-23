import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { api } from '@/lib/api';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import GroupsPage from '@/pages/GroupsPage';
import GroupDetailPage from '@/pages/GroupDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import AIToolsPage from '@/pages/AIToolsPage';
import AdminDashboard from '@/pages/AdminDashboard';
import TherapistDashboard from '@/pages/TherapistDashboard';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { user, isLoading, setUser } = useAuthStore();

  useEffect(() => {
    // Check for existing session on app load
    const initializeAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };

    initializeAuth();
  }, [setUser]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/login"
                element={user ? <Navigate to="/app" /> : <LoginPage />}
              />
              <Route
                path="/register"
                element={user ? <Navigate to="/app" /> : <RegisterPage />}
              />

              {/* Protected routes */}
              <Route
                path="/app"
                element={user ? <Layout /> : <Navigate to="/login" />}
              >
                <Route index element={<DashboardPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="groups/:groupId" element={<GroupDetailPage />} />
                <Route path="ai-tools" element={<AIToolsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Admin routes */}
              <Route
                path="/admin"
                element={user ? <AdminDashboard /> : <Navigate to="/login" />}
              />

              {/* Therapist routes */}
              <Route
                path="/therapist"
                element={user ? <TherapistDashboard /> : <Navigate to="/login" />}
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </Router>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />

      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;