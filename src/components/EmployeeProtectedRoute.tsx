import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';

interface EmployeeProtectedRouteProps {
  children: React.ReactNode;
}

const EmployeeProtectedRoute: React.FC<EmployeeProtectedRouteProps> = ({ children }) => {
  const { employee, loading, isAuthenticated } = useEmployeeAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading employee access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !employee) {
    return <Navigate to="/employee/auth" replace />;
  }
  return <>{children}</>;
};

export default EmployeeProtectedRoute;
