import { useState, useEffect } from "react";
import { OrderCard, Order } from "./OrderCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { RefreshCw, Clock, AlertCircle, ChefHat } from "lucide-react";

interface KitchenViewProps {
  orders: Order[];
  onOrderStatusChange: (orderId: string, newStatus: Order["status"]) => void;
  onRefresh: () => void;
}

export function KitchenView({ orders, onOrderStatusChange, onRefresh }: KitchenViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders relevant to kitchen (pendiente and preparando)
  const kitchenOrders = orders.filter(order => 
    order.status === "pendiente" || order.status === "preparando"
  );

  const pendingOrders = orders.filter(order => order.status === "pendiente");
  const preparingOrders = orders.filter(order => order.status === "preparando");

  const getWaitTime = (orderTime: Date) => {
    const diff = Math.floor((currentTime.getTime() - orderTime.getTime()) / (1000 * 60));
    return diff;
  };

  const getUrgentOrders = () => {
    return kitchenOrders.filter(order => getWaitTime(order.timestamp) > 15);
  };

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
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Kitchen Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl text-yellow-600">{pendingOrders.length}</p>
            <p className="text-sm text-muted-foreground">En Cola</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ChefHat className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl text-blue-600">{preparingOrders.length}</p>
            <p className="text-sm text-muted-foreground">Preparando</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-3xl text-red-600">{getUrgentOrders().length}</p>
            <p className="text-sm text-muted-foreground">Urgentes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl text-green-600">{kitchenOrders.length}</p>
            <p className="text-sm text-muted-foreground">Total Activos</p>
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
      <div className="space-y-6">
        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3>Pedidos Pendientes</h3>
              <Badge variant="secondary">{pendingOrders.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingOrders
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                .map((order) => {
                  const waitTime = getWaitTime(order.timestamp);
                  const isUrgent = waitTime > 15;
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`relative ${isUrgent ? 'ring-2 ring-red-500 rounded-lg' : ''}`}
                    >
                      {isUrgent && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge variant="destructive" className="text-xs">
                            {waitTime}min
                          </Badge>
                        </div>
                      )}
                      <OrderCard
                        order={order}
                        onStatusChange={onOrderStatusChange}
                        showActions={true}
                        compact={false}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Preparing Orders */}
        {preparingOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3>En Preparación</h3>
              <Badge variant="secondary">{preparingOrders.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preparingOrders
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                .map((order) => {
                  const waitTime = getWaitTime(order.timestamp);
                  const isUrgent = waitTime > 15;
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`relative ${isUrgent ? 'ring-2 ring-red-500 rounded-lg' : ''}`}
                    >
                      {isUrgent && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <Badge variant="destructive" className="text-xs">
                            {waitTime}min
                          </Badge>
                        </div>
                      )}
                      <OrderCard
                        order={order}
                        onStatusChange={onOrderStatusChange}
                        showActions={true}
                        compact={false}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
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