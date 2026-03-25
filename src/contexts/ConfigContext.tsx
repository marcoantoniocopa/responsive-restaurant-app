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

// Static fallback names in case API hasn't loaded yet
const FALLBACK_PAYMENT_METHODS: Record<number, string> = {
  1: "Efectivo",
  2: "QR",
};

const FALLBACK_ORDER_TYPES: Record<number, string> = {
  1: "Llevar",
  2: "En Local",
  3: "Reserva",
};

const FALLBACK_ORDER_STATUSES: Record<number, { name: string; code: string }> = {
  1: { name: "Reserva", code: "reserva" },
  2: { name: "Nuevo", code: "nuevo" },
  3: { name: "En Progreso", code: "en_progreso" },
  4: { name: "Completado", code: "completado" },
  5: { name: "Cancelado", code: "cancelado" },
  6: { name: "Servir Sopa", code: "servir_sopa" },
};

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
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const fetchConfig = async (force = false) => {
    if (hasFetched && !force) return; // Prevent duplicate fetches
    if (fetchAttempted && !force) return; // Prevent retry loops on error
    
      setIsLoading(true);
    setFetchAttempted(true);
      
    try {
      const [paymentMethodsData, orderTypesData, orderStatusesData] = await Promise.all([
        apiClient.getPaymentMethods(),
        apiClient.getOrderTypes(),
        apiClient.getOrderStatuses(),
      ]);
      
      setPaymentMethods(paymentMethodsData);
      setOrderTypes(orderTypesData);
      setOrderStatuses(orderStatusesData);
      setHasFetched(true);
    } catch (error) {
      console.error('Failed to load config:', error);
      // Don't retry automatically - use fallback values
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch once on mount (not on login page)
  useEffect(() => {
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
    if (!isLoginPage && !fetchAttempted) {
      fetchConfig();
    }
  }, []); // Empty dependency - run only once on mount

  const getPaymentMethodName = (id: number): string => {
    // Try API data first, then fallback to static names
    const fromApi = paymentMethods.find(pm => pm.id === id)?.name;
    return fromApi || FALLBACK_PAYMENT_METHODS[id] || `Payment Method ${id}`;
  };

  const getOrderTypeName = (id: number): string => {
    // Try API data first, then fallback to static names
    const fromApi = orderTypes.find(ot => ot.id === id)?.name;
    return fromApi || FALLBACK_ORDER_TYPES[id] || `Order Type ${id}`;
  };

  const getOrderStatusName = (id: number): string => {
    // Try API data first, then fallback to static names
    const fromApi = orderStatuses.find(os => os.id === id)?.name;
    return fromApi || FALLBACK_ORDER_STATUSES[id]?.name || `Status ${id}`;
  };

  const getOrderStatusCode = (id: number): string => {
    // Try API data first, then fallback to static codes
    const fromApi = orderStatuses.find(os => os.id === id)?.code;
    return fromApi || FALLBACK_ORDER_STATUSES[id]?.code || `status_${id}`;
  };

  const refreshConfig = async () => {
    setFetchAttempted(false);
    await fetchConfig(true);
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
