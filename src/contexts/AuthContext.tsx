import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { KeycloakUser, hasRole as checkRole } from '../lib/keycloak';
import { toast } from 'sonner';

interface AuthContextType {
  user: KeycloakUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getDefaultRoute: () => string;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<KeycloakUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-refresh token before it expires (7.5 hours)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = 7.5 * 60 * 60 * 1000; // 7.5 hours in milliseconds
    
    const interval = setInterval(async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // The API client will handle the refresh automatically
          await apiClient.getCurrentUser();
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        await logout();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [user]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token is still valid
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // Token expired or invalid, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tokenExpiry');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const userData = await apiClient.login(username, password);
      setUser(userData);
      toast.success('Inicio de sesión exitoso', {
        description: `Bienvenido de nuevo, ${userData.name || username}!`,
      });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Error al iniciar sesión';
      toast.error('Error al iniciar sesión', {
        description: message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logoutUser();
      setUser(null);
      toast.success('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      setUser(null);
    }
  };

  const hasRole = (role: string): boolean => {
    return checkRole(user, role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => checkRole(user, role));
  };

  const getDefaultRoute = (): string => {
    if (!user) return '/login';
    
    // Check user roles and return appropriate default route
    // Priority: Kitchen > Cashier > Default
    if (checkRole(user, 'kitchen') || checkRole(user, 'chef')) {
      return '/cocina';
    }
    if (checkRole(user, 'cashier') || checkRole(user, 'caja')) {
      return '/caja';
    }
    if (checkRole(user, 'admin')) {
      return '/caja'; // Admin can access all, default to cashier view
    }
    
    // Default fallback
    return '/pedidos';
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
    getDefaultRoute,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

