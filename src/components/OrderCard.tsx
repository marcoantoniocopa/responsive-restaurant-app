import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export interface Order {
  id: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: "pendiente" | "preparando" | "listo" | "entregado" | "cancelado";
  timestamp: Date;
  orderType: "local" | "online" | "takeaway";
}

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function OrderCard({ order, onStatusChange, showActions = false, compact = false }: OrderCardProps) {
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "preparando": return "bg-blue-100 text-blue-800";
      case "listo": return "bg-green-100 text-green-800";
      case "entregado": return "bg-gray-100 text-gray-800";
      case "cancelado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <Card className={`w-full ${compact ? 'mb-2' : 'mb-4'}`}>
      <CardHeader className={`pb-3 ${compact ? 'py-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={compact ? "text-lg" : "text-xl"}>#{order.id}</span>
            <Badge variant="secondary" className="text-xs">
              {order.orderType}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formatTime(order.timestamp)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={compact ? "text-base" : "text-lg"}>{order.customerName}</span>
          <Badge className={`${getStatusColor(order.status)} ${compact ? 'text-xs' : 'text-sm'}`}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className={compact ? 'py-2' : ''}>
        <div className="space-y-2 mb-4">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className={`${compact ? 'text-sm' : 'text-base'}`}>
                {item.quantity}x {item.name}
              </span>
              <span className={`${compact ? 'text-sm' : 'text-base'} text-muted-foreground`}>
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center border-t pt-3">
          <span className={compact ? "text-base" : "text-lg"}>Total:</span>
          <span className={`${compact ? 'text-base' : 'text-lg'} text-primary`}>
            ${order.total.toFixed(2)}
          </span>
        </div>
        
        {showActions && onStatusChange && (
          <div className="flex gap-2 mt-4">
            {order.status === "pendiente" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, "preparando")}
                className="flex-1"
              >
                Iniciar
              </Button>
            )}
            {order.status === "preparando" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, "listo")}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Listo
              </Button>
            )}
            {order.status === "listo" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, "entregado")}
                className="flex-1"
              >
                Entregado
              </Button>
            )}
            {(order.status === "pendiente" || order.status === "preparando") && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onStatusChange(order.id, "cancelado")}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}