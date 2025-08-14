import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface RoleBasedRedirectProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

/**
 * Component that redirects members to appropriate portals based on their role
 */
export default function RoleBasedRedirect({
  children,
  allowedRoles = [],
  redirectTo
}: RoleBasedRedirectProps) {
  const { member } = useAuthStore();

  if (!member) {
    return <Navigate to="/login" replace />;
  }

  // If no allowed roles specified, allow access
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if member's role is in allowed roles
  if (!allowedRoles.includes(member.role)) {
    // Redirect to appropriate portal based on member role
    const roleRedirects: Record<string, string> = {
      'admin': '/admin',
      'therapist': '/therapist',
      'member': '/app',
      'facilitator': '/app'
    };

    const defaultRedirect = roleRedirects[member.role] || '/app';
    return <Navigate to={redirectTo || defaultRedirect} replace />;
  }

  return <>{children}</>;
}

/**
 * Hook to get the default portal URL for a member's role
 */
export function useRoleBasedDefaultRoute() {
  const { member } = useAuthStore();

  if (!member) return '/login';

  const roleDefaults: Record<string, string> = {
    'admin': '/admin',
    'therapist': '/therapist',
    'member': '/app',
    'facilitator': '/app'
  };

  return roleDefaults[member.role] || '/app';
}

/**
 * Component that automatically redirects members to their default portal
 */
export function PortalRedirect() {
  const defaultRoute = useRoleBasedDefaultRoute();
  return <Navigate to={defaultRoute} replace />;
}