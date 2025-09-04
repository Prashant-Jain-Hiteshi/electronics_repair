import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { UserRole } from '@/types';
import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles = [],
  redirectTo = '/login',
  requireAuth = true,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { showToast } = useUIStore();

  // Check if user has required role
  const hasRequiredRole = roles.length === 0 || (user && roles.includes(user.role));

  // Show error toast when access is denied
  useEffect(() => {
    if (!loading && requireAuth) {
      if (!isAuthenticated) {
        showToast('Please log in to access this page', 'error');
      } else if (!hasRequiredRole) {
        showToast('You do not have permission to access this page', 'error');
      }
    }
  }, [isAuthenticated, hasRequiredRole, loading, requireAuth, showToast]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user doesn't have required role, redirect to home or specified path
  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has required role
  return <>{children}</>;
};

// Role-based route components
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={['admin']}>
    {children}
  </ProtectedRoute>
);

export const TechnicianRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={['admin', 'technician']}>
    {children}
  </ProtectedRoute>
);

export const CustomerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute roles={['customer']}>
    {children}
  </ProtectedRoute>
);

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAuth={false}>
    {children}
  </ProtectedRoute>
);
