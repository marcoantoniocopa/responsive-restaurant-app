import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * Protects routes based on user roles
 * If user doesn't have any of the allowed roles, shows access denied message
 */
export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles,
  redirectTo 
}: RoleProtectedRouteProps) => {
  const { hasAnyRole, getDefaultRoute, user } = useAuth();

  // Check if user has any of the allowed roles
  const hasAccess = hasAnyRole(allowedRoles);

  if (!hasAccess) {
    // If redirectTo is specified, redirect there
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Otherwise show access denied page
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <ShieldAlert className="h-20 w-20 text-red-500 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No tienes permisos para acceder a esta página. 
            Contacta al administrador si crees que esto es un error.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Tu rol actual: <span className="font-medium capitalize">{user?.roles?.join(', ') || 'Sin rol'}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Roles requeridos: <span className="font-medium capitalize">{allowedRoles.join(' o ')}</span>
            </p>
          </div>
          <Button 
            className="mt-6"
            onClick={() => window.location.href = getDefaultRoute()}
          >
            Ir a mi página principal
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

