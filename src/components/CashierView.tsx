import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { OrderCard, Order } from "./OrderCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader } from "./ui/card";
import { RefreshCw, TrendingUp, Clock, CheckCircle, Plus, Zap, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Currency } from "./Currency";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { useConfig } from "../contexts/ConfigContext";
import { useAuth } from "../contexts/AuthContext";
import { ORDER_STATUS } from "../constants/orderStatus";

interface SegundoAvailability {
  segundoProductId: string;
  segundoProductName: string;
  totalPlates: number;
  soldPlates: number;
  remainingPlates: number;
}

interface CashierViewProps {}

const ORDERS_PER_PAGE = 20;

const isLunchTime = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 11 && hours < 19;
};

export function CashierView({}: CashierViewProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedTab, setSelectedTab] = useState<number | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailModalOrderId, setDetailModalOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [availability, setAvailability] = useState<SegundoAvailability[]>([]);
  const [showAvailability, setShowAvailability] = useState(isLunchTime());
  const [searchName, setSearchName] = useState("");
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    reserva: 0,
    nuevo: 0,
    en_progreso: 0,
    completado: 0,
    revenue: 0,
  });
  const { toast } = useToast();
  const { getOrderStatusName, getOrderStatusCode } = useConfig();
  const { hasRole } = useAuth();
  const isInitialMount = useRef(true);

  // Get local day start and end as ISO strings (UTC)
  const getLocalDayRangeAsUTC = () => {
    const now = new Date();
    
    // Start of local day
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    // End of local day
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    return {
      dateFrom: startOfDay.toISOString(),
      dateTo: endOfDay.toISOString(),
    };
  };

  // Fetch order counts for tabs (all statuses) and revenue
  const fetchOrderCounts = async () => {
    try {
      const { dateFrom, dateTo } = getLocalDayRangeAsUTC();
      
      // Fetch all orders just to get counts (we could optimize with a separate count endpoint)
      const allOrdersData = await apiClient.getOrders({
        dateFrom,
        dateTo,
        limit: 500,
      });
      
      const completedOrders = allOrdersData.filter((o: any) => o.currentStatus === ORDER_STATUS.COMPLETADO);
      const revenue = completedOrders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
      
      const counts = {
        all: allOrdersData.length,
        reserva: allOrdersData.filter((o: any) => o.currentStatus === ORDER_STATUS.RESERVA).length,
        nuevo: allOrdersData.filter((o: any) => o.currentStatus === ORDER_STATUS.NUEVO).length,
        en_progreso: allOrdersData.filter((o: any) => o.currentStatus === ORDER_STATUS.EN_PROGRESO || o.currentStatus === ORDER_STATUS.SERVIR_SOPA).length,
        completado: completedOrders.length,
        revenue,
      };
      
      setOrderCounts(counts);
    } catch (error) {
      console.error("Failed to fetch order counts:", error);
    }
  };

  // Fetch orders from backend with pagination
  const fetchOrders = async (showLoadingIndicator = true, page = currentPage, status?: number | "all") => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const { dateFrom, dateTo } = getLocalDayRangeAsUTC();
      const offset = (page - 1) * ORDERS_PER_PAGE;
      
      // Build query params
      const params: any = {
        dateFrom,
        dateTo,
        limit: ORDERS_PER_PAGE,
        offset,
      };
      
      // Add status filter if not "all"
      // "En Progreso" tab also includes "Servir Sopa" (6), so skip API filter and handle client-side
      const statusFilter = status !== undefined ? status : selectedTab;
      if (statusFilter !== "all" && statusFilter !== ORDER_STATUS.EN_PROGRESO) {
        params.status = statusFilter;
      }
      
      // Fetch paginated orders
      const ordersData = await apiClient.getOrders(params);
      
      // Transform backend orders to frontend format
      const transformedOrders: Order[] = ordersData.map((order: any) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        observation: order.observation,
        pickupTime: order.pickupTime ? new Date(order.pickupTime) : undefined,
        items: order.items.map((item: any) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          isCompleto: item.isCompleto,
          components: item.completoComponents?.map((comp: any) => comp.productName),
        })),
        total: order.totalPrice,
        status: order.currentStatus, // Numeric status
        timestamp: new Date(order.createdAt),
        orderType: order.orderType, // Numeric order type
        paymentMethod: order.paymentMethod, // Numeric payment method
      }));
      
      // Client-side filter for "En Progreso" tab: include both status 3 and 6
      const statusToFilter = status !== undefined ? status : selectedTab;
      if (statusToFilter === ORDER_STATUS.EN_PROGRESO) {
        setOrders(transformedOrders.filter(o =>
          o.status === ORDER_STATUS.EN_PROGRESO || o.status === ORDER_STATUS.SERVIR_SOPA
        ));
      } else {
        setOrders(transformedOrders);
      }
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los pedidos. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await apiClient.getSegundoAvailability();
      setAvailability(response.data || []);
    } catch {
      setAvailability([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrders();
    fetchOrderCounts();
    fetchAvailability();
  }, []);

  // Check lunch-time visibility every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setShowAvailability(isLunchTime());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Refetch when page or tab changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchOrders(false);
  }, [currentPage, selectedTab]);

  const handleRefresh = () => {
    fetchOrders(false);
    fetchOrderCounts();
    fetchAvailability();
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: number) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      
      toast({
        variant: "success",
        title: "Estado actualizado",
        description: `El pedido ha sido actualizado a: ${getOrderStatusName(newStatus)}`,
      });
      
      // Refresh orders
      await fetchOrders(false);
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error?.message || "No se pudo actualizar el estado del pedido.",
        variant: "destructive",
      });
    }
  };

  const handleNewOrder = () => {
    navigate("/caja/nuevo-pedido");
  };

  // Get total count based on current filter
  const getTotalCount = () => {
    if (selectedTab === "all") return orderCounts.all;
    if (selectedTab === ORDER_STATUS.RESERVA) return orderCounts.reserva;
    if (selectedTab === ORDER_STATUS.NUEVO) return orderCounts.nuevo;
    if (selectedTab === ORDER_STATUS.EN_PROGRESO) return orderCounts.en_progreso;
    if (selectedTab === ORDER_STATUS.COMPLETADO) return orderCounts.completado;
    return 0;
  };

  const totalCount = getTotalCount();
  const totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE);

  // Reset to page 1 when changing tabs
  const handleTabChange = (value: string) => {
    const newTab = value === "all" ? "all" : parseInt(value);
    setSelectedTab(newTab);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filteredOrders = searchName.trim()
    ? orders.filter(o => o.customerName?.toLowerCase().includes(searchName.toLowerCase()))
    : orders;

  // Stats from orderCounts (not paginated)
  const stats = {
    total: orderCounts.all,
    pending: orderCounts.reserva + orderCounts.nuevo,
    preparing: orderCounts.en_progreso,
    completed: orderCounts.completado,
    revenue: orderCounts.revenue,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2>Panel de Caja</h2>
        {showAvailability && availability.length > 0 && (
          <div className="flex items-center gap-3">
            {availability.map((item) => (
              <Badge
                key={item.segundoProductId}
                variant={item.remainingPlates <= 0 ? "destructive" : item.remainingPlates <= 5 ? "outline" : "secondary"}
                className="text-sm py-1 px-3"
              >
                {item.segundoProductName}: <span className="font-bold ml-1">{item.remainingPlates}</span>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => navigate("/caja/pedido-rapido")} size="sm" variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Pedido Rápido
          </Button>
          <Button onClick={handleNewOrder} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pedido
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Pedidos Hoy</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-2xl">{stats.preparing}</p>
            <p className="text-sm text-muted-foreground">En Proceso</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completados</p>
          </CardContent>
        </Card>
        
        {hasRole('admin') && (
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl"><Currency amount={stats.revenue} large /></p>
              <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Orders Tabs */}
      <Tabs value={selectedTab.toString()} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <span>Todos</span>
            <Badge variant="secondary" className="text-xs">
              {orderCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.RESERVA.toString()} className="flex items-center gap-2">
            <span className="hidden sm:inline">Reservas</span>
            <span className="sm:hidden">Res.</span>
            <Badge variant="secondary" className="text-xs">
              {orderCounts.reserva}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.NUEVO.toString()} className="flex items-center gap-2">
            <span className="hidden sm:inline">Nuevos</span>
            <span className="sm:hidden">Nuevo</span>
            <Badge variant="secondary" className="text-xs">
              {orderCounts.nuevo}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.EN_PROGRESO.toString()} className="flex items-center gap-2">
            <span className="hidden sm:inline">En Progreso</span>
            <span className="sm:hidden">Prog.</span>
            <Badge variant="secondary" className="text-xs">
              {orderCounts.en_progreso}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value={ORDER_STATUS.COMPLETADO.toString()} className="flex items-center gap-2">
            <span className="hidden sm:inline">Completados</span>
            <span className="sm:hidden">Comp.</span>
            <Badge variant="secondary" className="text-xs">
              {orderCounts.completado}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Single content area - paginated from server */}
        <div className="space-y-4 mt-4">
          {/* Search by client name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre de cliente..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleOrderStatusChange}
                showActions={order.status !== ORDER_STATUS.COMPLETADO && order.status !== ORDER_STATUS.CANCELADO}
                compact={true}
                isDetailModalOpen={detailModalOrderId === order.id}
                onOpenDetailModal={setDetailModalOrderId}
                onCloseDetailModal={() => setDetailModalOrderId(null)}
              />
            ))}
          </div>

          {/* Pagination Controls - Bottom Right */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-4">
              <span className="text-sm text-muted-foreground mr-2">
                {((currentPage - 1) * ORDERS_PER_PAGE) + 1}-{Math.min(currentPage * ORDERS_PER_PAGE, totalCount)} de {totalCount}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isRefreshing}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and adjacent pages
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, arr) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1;
                    return (
                      <span key={page} className="flex items-center">
                        {showEllipsisBefore && <span className="px-2 text-muted-foreground">...</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          disabled={isRefreshing}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </span>
                    );
                  })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || isRefreshing}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Tabs>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchName.trim() ? "No se encontraron pedidos para ese cliente" : "No hay pedidos disponibles"}
          </p>
        </div>
      )}
    </div>
  );
}