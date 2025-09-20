import { useState } from "react";
import { OrderCard, Order } from "./OrderCard";
import { CashierOrderForm } from "./CashierOrderForm";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader } from "./ui/card";
import { RefreshCw, TrendingUp, Clock, CheckCircle, Plus } from "lucide-react";

interface CashierViewProps {
  orders: Order[];
  onOrderStatusChange: (orderId: string, newStatus: Order["status"]) => void;
  onOrderSubmit: (order: Omit<Order, "id" | "timestamp" | "status">) => void;
  onRefresh: () => void;
}

export function CashierView({ orders, onOrderStatusChange, onOrderSubmit, onRefresh }: CashierViewProps) {
  const [selectedTab, setSelectedTab] = useState("all");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const filterOrders = (status?: Order["status"]) => {
    if (!status) return orders;
    return orders.filter(order => order.status === status);
  };

  const getOrderStats = () => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
      order.timestamp.toDateString() === today
    );

    return {
      total: todayOrders.length,
      pending: todayOrders.filter(o => o.status === "pendiente").length,
      preparing: todayOrders.filter(o => o.status === "preparando").length,
      completed: todayOrders.filter(o => o.status === "entregado").length,
      revenue: todayOrders
        .filter(o => o.status === "entregado")
        .reduce((sum, o) => sum + o.total, 0)
    };
  };

  const stats = getOrderStats();

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2>Panel de Caja</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowOrderForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pedido
          </Button>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
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
            <p className="text-2xl">{stats.pending + stats.preparing}</p>
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
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl">${stats.revenue.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <span>Todos</span>
            <Badge variant="secondary" className="text-xs">
              {orders.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pendiente" className="flex items-center gap-2">
            <span className="hidden sm:inline">Pendientes</span>
            <span className="sm:hidden">Pend.</span>
            <Badge variant="secondary" className="text-xs">
              {filterOrders("pendiente").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="preparando" className="flex items-center gap-2">
            <span className="hidden sm:inline">Preparando</span>
            <span className="sm:hidden">Prep.</span>
            <Badge variant="secondary" className="text-xs">
              {filterOrders("preparando").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="listo" className="flex items-center gap-2">
            <span>Listos</span>
            <Badge variant="secondary" className="text-xs">
              {filterOrders("listo").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="entregado" className="flex items-center gap-2">
            <span className="hidden sm:inline">Entregados</span>
            <span className="sm:hidden">Entr.</span>
            <Badge variant="secondary" className="text-xs">
              {filterOrders("entregado").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={onOrderStatusChange}
                showActions={true}
                compact={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pendiente" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterOrders("pendiente").map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={onOrderStatusChange}
                showActions={true}
                compact={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preparando" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterOrders("preparando").map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={onOrderStatusChange}
                showActions={true}
                compact={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="listo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterOrders("listo").map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={onOrderStatusChange}
                showActions={true}
                compact={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="entregado" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterOrders("entregado").map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={onOrderStatusChange}
                showActions={false}
                compact={true}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay pedidos disponibles</p>
        </div>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <CashierOrderForm
          onOrderSubmit={onOrderSubmit}
          onClose={() => setShowOrderForm(false)}
        />
      )}
    </div>
  );
}