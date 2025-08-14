import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

/**
 * Protected route component that checks authentication and role permissions
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { member, isLoading } = useAuthStore();

  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check if authentication is required
  if (requireAuth && !member) {
    return <Navigate to="/login" replace />;
  }

  // If no specific roles required, allow access for any authenticated member
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if member has required role
  if (member && !allowedRoles.includes(member.role)) {
    // Redirect to appropriate portal based on member role
    // Note: Therapists can access both /therapist and /app routes
    const roleRedirects: Record<string, string> = {
      'admin': '/admin',
      'therapist': '/therapist',
      'member': '/app',
      'facilitator': '/app'
    };

    const redirectTo = roleRedirects[member.role] || '/app';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}