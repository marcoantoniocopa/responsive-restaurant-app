import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { PedidosPage } from "./pages/PedidosPage";
import { CajaPage } from "./pages/CajaPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { CocinaPage } from "./pages/CocinaPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ContablePage } from "./pages/ContablePage";
import { Order } from "./components/OrderCard";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/toaster";
import { useAuth } from "./contexts/AuthContext";

// Role constants for route protection
const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
  CHEF: 'chef',
  KITCHEN: 'kitchen',
};

// Mock data for demonstration
const generateMockOrders = (): Order[] => {
  const mockOrders: Order[] = [
    {
      id: "001",
      customerName: "María García",
      items: [
        { name: "Menú Ejecutivo", quantity: 1, price: 15.99 },
        { name: "Menú Saludable", quantity: 1, price: 12.99 }
      ],
      total: 28.98,
      status: "preparando",
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      orderType: "online"
    },
    {
      id: "002",
      customerName: "Carlos López",
      items: [
        { name: "Menú del Día", quantity: 2, price: 11.99 }
      ],
      total: 23.98,
      status: "pendiente",
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      orderType: "local"
    },
    {
      id: "003",
      customerName: "Ana Martínez",
      items: [
        { name: "Menú Vegetariano", quantity: 1, price: 13.99 }
      ],
      total: 13.99,
      status: "listo",
      timestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      orderType: "takeaway"
    },
    {
      id: "004",
      customerName: "Mesa 15",
      items: [
        { name: "Menú Ejecutivo", quantity: 2, price: 15.99 }
      ],
      total: 31.98,
      status: "pendiente",
      timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
      orderType: "local"
    }
  ];
  
  return mockOrders;
};

function AppContent() {
  const { getDefaultRoute } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextOrderId, setNextOrderId] = useState(5);

  // Initialize with mock data
  useEffect(() => {
    setOrders(generateMockOrders());
  }, []);

  const handleNewOrder = (orderData: Omit<Order, "id" | "timestamp" | "status">) => {
    const newOrder: Order = {
      ...orderData,
      id: nextOrderId.toString().padStart(3, '0'),
      timestamp: new Date(),
      status: "pendiente"
    };

    setOrders(prev => [newOrder, ...prev]);
    setNextOrderId(prev => prev + 1);
    
    toast.success(`Nuevo pedido #${newOrder.id} recibido`, {
      description: `${newOrder.customerName} - $${newOrder.total.toFixed(2)}`
    });
  };

  const handleOrderStatusChange = (orderId: string, newStatus: Order["status"]) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    ));

    const order = orders.find(o => o.id === orderId);
    if (order) {
      let message = "";
      switch (newStatus) {
        case "preparando":
          message = `Pedido #${orderId} iniciado en cocina`;
          break;
        case "listo":
          message = `Pedido #${orderId} está listo para entrega`;
          break;
        case "entregado":
          message = `Pedido #${orderId} entregado exitosamente`;
          break;
        case "cancelado":
          message = `Pedido #${orderId} cancelado`;
          break;
      }
      
      if (message) {
        toast.info(message);
      }
    }
  };

  const handleRefresh = () => {
    // In a real app, this would fetch fresh data from the server
    toast.success("Datos actualizados");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main>
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
          
          {/* Pedidos - Admin and Cashier only */}
          <Route
            path="/pedidos"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CASHIER]}>
                <PedidosPage onOrderSubmit={handleNewOrder} />
              </RoleProtectedRoute>
            }
          />
          
          {/* Caja - Admin and Cashier only */}
          <Route
            path="/caja"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CASHIER]}>
                <CajaPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* New Order - Admin and Cashier only */}
          <Route
            path="/caja/nuevo-pedido"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CASHIER]}>
                <NewOrderPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* Cocina - Admin, Chef, and Kitchen staff */}
          <Route
            path="/cocina"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CHEF, ROLES.KITCHEN]}>
                <CocinaPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* Products - Admin and Cashier */}
          <Route
            path="/products"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CASHIER]}>
                <ProductsPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* Categories - Admin only */}
          <Route
            path="/categories"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <CategoriesPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* Settings - Admin only */}
          <Route
            path="/settings"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <SettingsPage />
              </RoleProtectedRoute>
            }
          />
          
          {/* Contable - Admin only */}
          <Route
            path="/contable"
            element={
              <RoleProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <ContablePage />
              </RoleProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </main>
      
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </BrowserRouter>
  );
}
