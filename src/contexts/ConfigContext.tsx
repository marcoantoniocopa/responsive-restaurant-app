import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api';

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface OrderType {
  id: number;
  name: string;
}

export interface OrderStatus {
  id: number;
  name: string;
  code: string;
}

interface ConfigContextType {
  paymentMethods: PaymentMethod[];
  orderTypes: OrderType[];
  orderStatuses: OrderStatus[];
  isLoading: boolean;
  getPaymentMethodName: (id: number) => string;
  getOrderTypeName: (id: number) => string;
  getOrderStatusName: (id: number) => string;
  getOrderStatusCode: (id: number) => string;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchConfig = async () => {
    if (hasFetched) return; // Prevent duplicate fetches
    
    setIsLoading(true);
    setHasFetched(true);
    
    try {
      const [paymentMethodsData, orderTypesData, orderStatusesData] = await Promise.all([
        apiClient.getPaymentMethods(),
        apiClient.getOrderTypes(),
        apiClient.getOrderStatuses(),
      ]);
      
      setPaymentMethods(paymentMethodsData);
      setOrderTypes(orderTypesData);
      setOrderStatuses(orderStatusesData);
    } catch (error) {
      console.error('Failed to load config:', error);
      setHasFetched(false); // Allow retry on error
    } finally {
      setIsLoading(false);
    }
  };

  // Don't fetch on mount - let components fetch when needed
  useEffect(() => {
    // Only fetch if we're not on the login page
    const isLoginPage = window.location.pathname === '/login';
    if (!isLoginPage && !hasFetched) {
      fetchConfig();
    }
  }, [hasFetched]);

  const getPaymentMethodName = (id: number): string => {
    return paymentMethods.find(pm => pm.id === id)?.name || `Payment Method ${id}`;
  };

  const getOrderTypeName = (id: number): string => {
    return orderTypes.find(ot => ot.id === id)?.name || `Order Type ${id}`;
  };

  const getOrderStatusName = (id: number): string => {
    return orderStatuses.find(os => os.id === id)?.name || `Status ${id}`;
  };

  const getOrderStatusCode = (id: number): string => {
    return orderStatuses.find(os => os.id === id)?.code || `status_${id}`;
  };

  const refreshConfig = async () => {
    setIsLoading(true);
    await fetchConfig();
  };

  return (
    <ConfigContext.Provider
      value={{
        paymentMethods,
        orderTypes,
        orderStatuses,
        isLoading,
        getPaymentMethodName,
        getOrderTypeName,
        getOrderStatusName,
        getOrderStatusCode,
        refreshConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
