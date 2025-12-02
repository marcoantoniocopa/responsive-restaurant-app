import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api';

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
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [numberOfTables, setNumberOfTables] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchSettings = async () => {
    if (hasFetched) return; // Prevent duplicate fetches
    
    setLoading(true);
    setHasFetched(true);
    
    try {
      const settings = await apiClient.getSettings();
      setCurrencySymbol(settings.currencySymbol || '$');
      setNumberOfTables(settings.numberOfTables || 6);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if settings can't be loaded
      setCurrencySymbol('$');
      setNumberOfTables(6);
      setHasFetched(false); // Allow retry on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we're not on the login page
    const isLoginPage = window.location.pathname === '/login';
    if (!isLoginPage && !hasFetched) {
      fetchSettings();
    }
  }, [hasFetched]);

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ currencySymbol, numberOfTables, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

