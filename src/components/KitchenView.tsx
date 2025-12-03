import { useState, useEffect } from "react";
import { KitchenOrderCard, KitchenOrder } from "./KitchenOrderCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { RefreshCw, Clock, AlertCircle, ChefHat, Loader2, ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { useConfig } from "../contexts/ConfigContext";
import { ORDER_STATUS } from "../constants/orderStatus";
import "../styles/kitchen.css";

interface KitchenViewProps {}

export function KitchenView({}: KitchenViewProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailModalOrderId, setDetailModalOrderId] = useState<string | null>(null);
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isPreparingOpen, setIsPreparingOpen] = useState(true);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isCancelledOpen, setIsCancelledOpen] = useState(false);
  const { toast } = useToast();
  const { getOrderStatusName } = useConfig();

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

  // Fetch orders from backend with pagination
  const fetchOrders = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const { dateFrom, dateTo } = getLocalDayRangeAsUTC();
      
      // Fetch orders for current local day (converted to UTC)
      // sortItems=kitchen sorts items within orders: Completo first, then Sopa/Segundo
      const ordersData = await apiClient.getOrders({
        dateFrom,
        dateTo,
        limit: 100, // Get enough orders for all statuses
        sortItems: 'kitchen',
      });
      
      // Transform backend orders to kitchen format (no prices needed)
      const transformedOrders: KitchenOrder[] = ordersData.map((order: any) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        items: order.items.map((item: any) => ({
          name: item.productName,
          quantity: item.quantity,
          isCompleto: item.isCompleto,
          components: item.completoComponents?.map((comp: any) => comp.productName),
        })),
        status: order.currentStatus,
        timestamp: new Date(order.createdAt),
        orderType: order.orderType,
      }));
      
      setOrders(transformedOrders);
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

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh orders every 30 seconds for kitchen
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      fetchOrders(false);
    }, 30000);
    return () => clearInterval(refreshTimer);
  }, []);

  const handleRefresh = () => {
    fetchOrders(false);
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

  // Filter orders relevant to kitchen (Reserva, Nuevo, En Progreso)
  const kitchenOrders = orders.filter(order => 
    order.status === ORDER_STATUS.RESERVA || 
    order.status === ORDER_STATUS.NUEVO || 
    order.status === ORDER_STATUS.EN_PROGRESO
  );

  // Pending = Reserva (1) or Nuevo (2) - orders waiting to start
  const pendingOrders = orders.filter(order => 
    order.status === ORDER_STATUS.RESERVA || order.status === ORDER_STATUS.NUEVO
  );
  
  // Preparing = En Progreso (3)
  const preparingOrders = orders.filter(order => order.status === ORDER_STATUS.EN_PROGRESO);
  
  // Completed = Completado (4)
  const completedOrders = orders.filter(order => order.status === ORDER_STATUS.COMPLETADO);
  
  // Cancelled = Cancelado (5)
  const cancelledOrders = orders.filter(order => order.status === ORDER_STATUS.CANCELADO);

  // Default number of orders to show per section
  const DEFAULT_DISPLAY_LIMIT = 4;

  // Filter handlers for stat cards
  const handleFilterPending = () => {
    setIsPendingOpen(true);
    setIsPreparingOpen(false);
    setIsCompletedOpen(false);
    setIsCancelledOpen(false);
  };

  const handleFilterPreparing = () => {
    setIsPendingOpen(false);
    setIsPreparingOpen(true);
    setIsCompletedOpen(false);
    setIsCancelledOpen(false);
  };

  const handleFilterCompleted = () => {
    setIsPendingOpen(false);
    setIsPreparingOpen(false);
    setIsCompletedOpen(true);
    setIsCancelledOpen(false);
  };

  const handleFilterCancelled = () => {
    setIsPendingOpen(false);
    setIsPreparingOpen(false);
    setIsCompletedOpen(false);
    setIsCancelledOpen(true);
  };

  const handleShowAll = () => {
    setIsPendingOpen(true);
    setIsPreparingOpen(true);
    setIsCompletedOpen(false);
    setIsCancelledOpen(false);
  };

  // Get orders to display (limited unless section is the only one open)
  const getDisplayOrders = (ordersList: KitchenOrder[], isOnlyOpenSection: boolean) => {
    if (isOnlyOpenSection) {
      return ordersList; // Show all when this is the only open section
    }
    return ordersList.slice(0, DEFAULT_DISPLAY_LIMIT); // Show only first 4
  };

  // Check if a section is the only one open
  const isPendingOnlyOpen = isPendingOpen && !isPreparingOpen && !isCompletedOpen && !isCancelledOpen;
  const isPreparingOnlyOpen = isPreparingOpen && !isPendingOpen && !isCompletedOpen && !isCancelledOpen;
  const isCompletedOnlyOpen = isCompletedOpen && !isPendingOpen && !isPreparingOpen && !isCancelledOpen;
  const isCancelledOnlyOpen = isCancelledOpen && !isPendingOpen && !isPreparingOpen && !isCompletedOpen;

  // Calculate item counts by category for kitchen summary
  const getKitchenItemCounts = (ordersList: KitchenOrder[]) => {
    const completos: Record<string, number> = {}; // Track each completo type separately
    const sopas: Record<string, number> = {};
    const segundos: Record<string, number> = {};

    ordersList.forEach(order => {
      order.items.forEach(item => {
        const itemName = item.name.toLowerCase();
        
        if (item.isCompleto) {
          // Track each completo by name
          completos[item.name] = (completos[item.name] || 0) + item.quantity;
        } else if (itemName.includes('sopa')) {
          sopas[item.name] = (sopas[item.name] || 0) + item.quantity;
        } else if (itemName.includes('segundo') || 
                   itemName.includes('pollo') || 
                   itemName.includes('carne') || 
                   itemName.includes('pescado') ||
                   itemName.includes('plancha')) {
          segundos[item.name] = (segundos[item.name] || 0) + item.quantity;
        }
      });
    });

    return { completos, sopas, segundos };
  };

  // Get counts for pending orders
  const pendingItemCounts = getKitchenItemCounts(pendingOrders);

  const getWaitTime = (orderTime: Date) => {
    const diff = Math.floor((currentTime.getTime() - orderTime.getTime()) / (1000 * 60));
    return diff;
  };

  const getUrgentOrders = () => {
    return kitchenOrders.filter(order => getWaitTime(order.timestamp) > 15);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Kitchen Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <div>
            <h2>Vista de Cocina</h2>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleTimeString("es-ES", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </p>
          </div>
        </div>
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

      {/* Kitchen Stats */}
      <div className="kitchen-stats-row">
        <Card 
          className="stat-card stat-card-yellow"
          onClick={handleFilterPending}
        >
          <CardContent className="stat-card-content">
            <Clock className="stat-icon text-yellow-600" />
            <p className="stat-number text-yellow-600">{pendingOrders.length}</p>
            <p className="stat-label">En Cola</p>
          </CardContent>
        </Card>
        
        <Card 
          className="stat-card stat-card-blue"
          onClick={handleFilterPreparing}
        >
          <CardContent className="stat-card-content">
            <ChefHat className="stat-icon text-blue-600" />
            <p className="stat-number text-blue-600">{preparingOrders.length}</p>
            <p className="stat-label">Preparando</p>
          </CardContent>
        </Card>
        
        <Card className="stat-card stat-card-orange">
          <CardContent className="stat-card-content">
            <AlertCircle className="stat-icon text-orange-600" />
            <p className="stat-number text-orange-600">{getUrgentOrders().length}</p>
            <p className="stat-label">Urgentes</p>
          </CardContent>
        </Card>
        
        <Card 
          className="stat-card stat-card-gray"
          onClick={handleShowAll}
        >
          <CardContent className="stat-card-content">
            <Clock className="stat-icon text-gray-600" />
            <p className="stat-number text-gray-600">{kitchenOrders.length}</p>
            <p className="stat-label">Activos</p>
          </CardContent>
        </Card>
        
        <Card 
          className="stat-card stat-card-green"
          onClick={handleFilterCompleted}
        >
          <CardContent className="stat-card-content">
            <CheckCircle className="stat-icon text-green-600" />
            <p className="stat-number text-green-600">{completedOrders.length}</p>
            <p className="stat-label">Entregados</p>
          </CardContent>
        </Card>
        
        <Card 
          className="stat-card stat-card-red"
          onClick={handleFilterCancelled}
        >
          <CardContent className="stat-card-content">
            <XCircle className="stat-icon text-red-600" />
            <p className="stat-number text-red-600">{cancelledOrders.length}</p>
            <p className="stat-label">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Orders Alert */}
      {getUrgentOrders().length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>
                {getUrgentOrders().length} pedido(s) llevan más de 15 minutos esperando
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Display */}
      <div className="space-y-4">
        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
            <CollapsibleTrigger className="collapsible-section-header collapsible-section-yellow">
              <div className="collapsible-section-title">
                {isPendingOpen ? (
                  <ChevronDown className="collapsible-icon" />
                ) : (
                  <ChevronRight className="collapsible-icon" />
                )}
                <h3>Pedidos Pendientes</h3>
                <Badge variant="secondary">{pendingOrders.length}</Badge>
                {/* Kitchen item summary */}
                <div className="kitchen-item-summary">
                  {Object.entries(pendingItemCounts.completos).map(([name, count]) => (
                    <span key={name} className="kitchen-summary-item kitchen-summary-completo">
                      {count} {name}
                    </span>
                  ))}
                  {Object.entries(pendingItemCounts.sopas).map(([name, count]) => (
                    <span key={name} className="kitchen-summary-item kitchen-summary-sopa">
                      {count} {name}
                    </span>
                  ))}
                  {Object.entries(pendingItemCounts.segundos).map(([name, count]) => (
                    <span key={name} className="kitchen-summary-item kitchen-summary-segundo">
                      {count} {name}
                    </span>
                  ))}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-section-content">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                {getDisplayOrders(
                  pendingOrders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
                  isPendingOnlyOpen
                ).map((order) => {
                  const waitTime = getWaitTime(order.timestamp);
                  
                  return (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      waitTime={waitTime}
                      isDetailModalOpen={detailModalOrderId === order.id}
                      onOpenDetailModal={setDetailModalOrderId}
                      onCloseDetailModal={() => setDetailModalOrderId(null)}
                    />
                  );
                })}
              </div>
              {!isPendingOnlyOpen && pendingOrders.length > DEFAULT_DISPLAY_LIMIT && (
                <button 
                  className="section-view-more"
                  onClick={(e) => { e.stopPropagation(); handleFilterPending(); }}
                >
                  Ver {pendingOrders.length - DEFAULT_DISPLAY_LIMIT} más
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Preparing Orders */}
        {preparingOrders.length > 0 && (
          <Collapsible open={isPreparingOpen} onOpenChange={setIsPreparingOpen}>
            <CollapsibleTrigger className="collapsible-section-header collapsible-section-blue">
              <div className="collapsible-section-title">
                {isPreparingOpen ? (
                  <ChevronDown className="collapsible-icon" />
                ) : (
                  <ChevronRight className="collapsible-icon" />
                )}
                <h3>En Preparación</h3>
                <Badge variant="secondary">{preparingOrders.length}</Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-section-content">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                {getDisplayOrders(
                  preparingOrders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
                  isPreparingOnlyOpen
                ).map((order) => {
                  const waitTime = getWaitTime(order.timestamp);
                  
                  return (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      waitTime={waitTime}
                      isDetailModalOpen={detailModalOrderId === order.id}
                      onOpenDetailModal={setDetailModalOrderId}
                      onCloseDetailModal={() => setDetailModalOrderId(null)}
                    />
                  );
                })}
              </div>
              {!isPreparingOnlyOpen && preparingOrders.length > DEFAULT_DISPLAY_LIMIT && (
                <button 
                  className="section-view-more"
                  onClick={(e) => { e.stopPropagation(); handleFilterPreparing(); }}
                >
                  Ver {preparingOrders.length - DEFAULT_DISPLAY_LIMIT} más
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Completed Orders - Only shown when Entregados filter is active */}
        {isCompletedOpen && completedOrders.length > 0 && (
          <Collapsible open={isCompletedOpen} onOpenChange={setIsCompletedOpen}>
            <CollapsibleTrigger className="collapsible-section-header collapsible-section-green">
              <div className="collapsible-section-title">
                {isCompletedOpen ? (
                  <ChevronDown className="collapsible-icon" />
                ) : (
                  <ChevronRight className="collapsible-icon" />
                )}
                <h3>Entregados Hoy</h3>
                <Badge variant="secondary">{completedOrders.length}</Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-section-content">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                {completedOrders
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      waitTime={0}
                      isDetailModalOpen={detailModalOrderId === order.id}
                      onOpenDetailModal={setDetailModalOrderId}
                      onCloseDetailModal={() => setDetailModalOrderId(null)}
                    />
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Cancelled Orders - Only shown when Cancelados filter is active */}
        {isCancelledOpen && cancelledOrders.length > 0 && (
          <Collapsible open={isCancelledOpen} onOpenChange={setIsCancelledOpen}>
            <CollapsibleTrigger className="collapsible-section-header collapsible-section-red">
              <div className="collapsible-section-title">
                {isCancelledOpen ? (
                  <ChevronDown className="collapsible-icon" />
                ) : (
                  <ChevronRight className="collapsible-icon" />
                )}
                <h3>Cancelados Hoy</h3>
                <Badge variant="secondary">{cancelledOrders.length}</Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="collapsible-section-content">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                {cancelledOrders
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      waitTime={0}
                      isDetailModalOpen={detailModalOrderId === order.id}
                      onOpenDetailModal={setDetailModalOrderId}
                      onCloseDetailModal={() => setDetailModalOrderId(null)}
                    />
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {kitchenOrders.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-muted-foreground mb-2">No hay pedidos activos</h3>
          <p className="text-sm text-muted-foreground">
            Los nuevos pedidos aparecerán aquí automáticamente
          </p>
        </div>
      )}
    </div>
  );
}