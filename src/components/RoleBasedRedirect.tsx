import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface RoleBasedRedirectProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * Component that redirects users to appropriate portals based on their role
 */
export default function RoleBasedRedirect({ 
  children, 
  allowedRoles = [], 
  redirectTo 
}: RoleBasedRedirectProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no allowed roles specified, allow access
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate portal based on user role
    const roleRedirects: Record<string, string> = {
      'admin': '/admin',
      'therapist': '/therapist',
      'member': '/app',
      'facilitator': '/app'
    };

    const defaultRedirect = roleRedirects[user.role] || '/app';
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  return <>{children}</>;
}

/**
 * Hook to get the default portal URL for a user's role
 */
export function useRoleBasedDefaultRoute() {
  const { user } = useAuthStore();

  if (!user) return '/login';

  const roleDefaults: Record<string, string> = {
    'admin': '/admin',
    'therapist': '/therapist', 
    'member': '/app',
    'facilitator': '/app'
  };

  return roleDefaults[user.role] || '/app';
}

/**
 * Component that automatically redirects users to their default portal
 */
export function PortalRedirect() {
  const defaultRoute = useRoleBasedDefaultRoute();
  return <Navigate to={defaultRoute} replace />;
}