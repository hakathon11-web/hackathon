import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  console.log('🔒 AdminProtectedRoute component called');
  
  const { user, profile, loading } = useAdminAuth();

  console.log('🔒 AdminProtectedRoute state:', {
    user: user?.email,
    profileRole: profile?.role,
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    emailConfirmed: !!user?.email_confirmed_at,
    userRole: profile?.role
  });

  if (loading) {
    console.log('🔒 AdminProtectedRoute: Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.email_confirmed_at) {
    console.log('🔒 AdminProtectedRoute: Redirecting to auth - no user or email not confirmed');
    return <Navigate to="/auth" replace />;
  }

  // If user is authenticated but profile fetching failed or returned null
  if (user && user.email_confirmed_at && !profile && !loading) {
    console.log('🔒 AdminProtectedRoute: Profile missing or failed to load');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.5 0L5.232 13.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Admin Profile Error</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load admin profile. This might be a temporary issue.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-primary-foreground px-4 py-2 rounded mr-2"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.location.href = '/auth'} 
              className="border border-border px-4 py-2 rounded"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.role !== 'admin') {
    console.log('🔒 AdminProtectedRoute: Access denied - role is:', profile.role);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need an admin account to access this page.</p>
          <p className="text-sm text-muted-foreground mt-2">Current role: {profile.role}</p>
        </div>
      </div>
    );
  }

  // If we have a user but no profile, show an error
  if (user && !profile && !loading) {
    console.log('🔒 AdminProtectedRoute: No profile found for user');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground">Your user profile could not be loaded. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  console.log('🔒 AdminProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};

export default AdminProtectedRoute;