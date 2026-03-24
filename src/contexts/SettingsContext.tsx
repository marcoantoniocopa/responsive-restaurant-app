import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  currencySymbol: string;
  numberOfTables: number;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  currencySymbol: '$',
  numberOfTables: 6,
  loading: true,
  refreshSettings: async () => {},
});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [numberOfTables, setNumberOfTables] = useState<number>(6);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await apiClient.getSettings();
      setCurrencySymbol(settings.currencySymbol || '$');
      setNumberOfTables(settings.numberOfTables || 6);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setCurrencySymbol('$');
      setNumberOfTables(6);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings after login. Previously we only fetched on first mount; if that was /login, fetch never ran
  // until "Guardar Configuración" called refreshSettings().
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setCurrencySymbol('$');
      setNumberOfTables(6);
      return;
    }
    void fetchSettings();
  }, [isAuthenticated, authLoading, fetchSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ currencySymbol, numberOfTables, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
