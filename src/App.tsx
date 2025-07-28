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
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import GroupsPage from '@/pages/GroupsPage';
import GroupDetailPage from '@/pages/GroupDetailPage';
import UserSessionsPage from '@/pages/UserSessionsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminDashboard from '@/pages/AdminDashboard';
import TherapistDashboard from '@/pages/TherapistDashboard';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PortalRedirect } from '@/components/RoleBasedRedirect';
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
                element={user ? <PortalRedirect /> : <LoginPage />}
              />
              <Route
                path="/register"
                element={user ? <PortalRedirect /> : <RegisterPage />}
              />
              <Route
                path="/forgot-password"
                element={user ? <PortalRedirect /> : <ForgotPasswordPage />}
              />
              <Route
                path="/reset-password"
                element={user ? <PortalRedirect /> : <ResetPasswordPage />}
              />

              {/* Portal redirect for authenticated users */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute>
                    <PortalRedirect />
                  </ProtectedRoute>
                }
              />

              {/* User Portal Routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute allowedRoles={['member', 'facilitator']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="groups/:groupId" element={<GroupDetailPage />} />
                <Route path="sessions" element={<UserSessionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Admin Portal Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Therapist Portal Routes */}
              <Route
                path="/therapist"
                element={
                  <ProtectedRoute allowedRoles={['therapist', 'admin']}>
                    <TherapistDashboard />
                  </ProtectedRoute>
                }
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