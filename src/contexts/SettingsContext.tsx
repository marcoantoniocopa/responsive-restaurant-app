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
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const fetchSettings = async (force = false) => {
    if (fetchAttempted && !force) return; // Prevent retry loops on error
    
    setLoading(true);
    setFetchAttempted(true);
    
    try {
      const settings = await apiClient.getSettings();
      setCurrencySymbol(settings.currencySymbol || '$');
      setNumberOfTables(settings.numberOfTables || 6);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if settings can't be loaded - don't retry automatically
      setCurrencySymbol('$');
      setNumberOfTables(6);
    } finally {
      setLoading(false);
    }
  };

  // Fetch once on mount (not on login page)
  useEffect(() => {
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    if (!isLoginPage && !fetchAttempted) {
      fetchSettings();
    }
  }, []); // Empty dependency - run only once on mount

  const refreshSettings = async () => {
    setFetchAttempted(false);
    await fetchSettings(true);
  };

  return (
    <SettingsContext.Provider value={{ currencySymbol, numberOfTables, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

