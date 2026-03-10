import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { CheckCircle, XCircle, ChevronDown, Utensils } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { useConfig } from "../contexts/ConfigContext";
import { ORDER_STATUS, getAvailableTransitions } from "../constants/orderStatus";
import "../styles/kitchen.css";

const MAX_VISIBLE_ITEMS = 5;

export interface KitchenOrder {
  id: string;
  orderNumber?: string;
  customerName: string;
  tableNumber?: string;
  observation?: string;
  items: Array<{
    name: string;
    quantity: number;
    isCompleto?: boolean;
    components?: string[];
  }>;
  status: number;
  timestamp: Date;
  orderType: number;
  pickupTime?: Date;
}

interface KitchenOrderCardProps {
  order: KitchenOrder;
  onStatusChange: (orderId: string, newStatus: number) => void;
  isDetailModalOpen?: boolean;
  onOpenDetailModal?: (orderId: string) => void;
  onCloseDetailModal?: () => void;
  waitTime?: number; // Minutes since order was placed
}

export function KitchenOrderCard({ 
  order, 
  onStatusChange,
  isDetailModalOpen = false,
  onOpenDetailModal,
  onCloseDetailModal,
  waitTime = 0,
}: KitchenOrderCardProps) {
  const { getOrderTypeName } = useConfig();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Get available next statuses based on current status and order context
  const availableStatuses = getAvailableTransitions(order.status, {
    orderType: order.orderType,
    items: order.items,
  });

  // Check if we need to truncate items
  const hasMoreItems = order.items.length > MAX_VISIBLE_ITEMS;
  const visibleItems = hasMoreItems ? order.items.slice(0, MAX_VISIBLE_ITEMS) : order.items;
  const hiddenItemsCount = order.items.length - MAX_VISIBLE_ITEMS;

  // Calculate total quantity of items
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCancelConfirm = () => {
    onStatusChange(order.id, ORDER_STATUS.CANCELADO);
    setShowCancelDialog(false);
  };

  const handleViewMore = () => {
    if (onOpenDetailModal) {
      onOpenDetailModal(order.id);
    }
  };

  // Get urgency level based on wait time
  const getUrgencyStyle = () => {
    // Only apply urgency styling for orderType 1 and 2
    if (order.orderType !== 1 && order.orderType !== 2) {
      return "kitchen-card-normal";
    }
    
    if (waitTime > 20) return "kitchen-card-urgent-high";
    if (waitTime > 15) return "kitchen-card-urgent-medium";
    if (waitTime > 10) return "kitchen-card-urgent-low";
    return "kitchen-card-normal";
  };

  // Render items list for kitchen (no prices, focused on preparation)
  const getCompletoLabel = (item: KitchenOrder['items'][0]) => {
    if (!item.isCompleto || !item.components) return item.name;
    const segundo = item.components.find(c => !c.toLowerCase().includes('sopa'));
    return segundo ? `Completo - ${segundo}` : item.name;
  };

  const renderItems = (items: KitchenOrder['items']) => (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index}>
          <div className="kitchen-item-row">
            <span className="kitchen-item-qty">
              {item.quantity}x
            </span>
            <span className={`kitchen-item-name ${item.isCompleto ? 'font-bold' : ''}`}>
              {item.isCompleto ? getCompletoLabel(item) : item.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className={`kitchen-card ${getUrgencyStyle()}`}>
      <CardHeader className="kitchen-card-header">
        {/* Order Header */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">
            #{order.orderNumber || order.id}
          </span>
          <Badge variant="secondary" className="text-[8px] px-1 py-0">
            {getOrderTypeName(order.orderType)}
          </Badge>
          <StatusBadge statusId={order.status} className="text-[8px]" />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] font-medium truncate">
            {order.customerName}
          </span>
        </div>
        {order.pickupTime && (
          <div className="kitchen-pickup-time">
            🕐 Recojo: {new Date(order.pickupTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {/* Observation */}
        {order.observation && (
          <div className="mt-1 pt-1 border-t border-dashed border-gray-200">
            <p className="text-[9px] text-muted-foreground italic">
              📝 {order.observation}
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="kitchen-card-content">
        {/* Items List */}
        <div className="kitchen-items-list">
          {renderItems(visibleItems)}
          
          {/* Show "Ver más" button if there are more items */}
          {hasMoreItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewMore}
              className="w-full mt-1 text-[10px] text-muted-foreground hover:text-foreground h-6"
            >
              <ChevronDown className="h-2.5 w-2.5 mr-0.5" />
              +{hiddenItemsCount} más
            </Button>
          )}
        </div>
        
        {/* Action Buttons - Always at bottom */}
        {availableStatuses.length > 0 && (
          <div className="kitchen-actions">
            {availableStatuses.includes(ORDER_STATUS.EN_PROGRESO) && (
              <button
                onClick={() => onStatusChange(order.id, ORDER_STATUS.EN_PROGRESO)}
                className="kitchen-btn kitchen-btn-green"
              >
                <Utensils />
                Preparar
              </button>
            )}
            {availableStatuses.includes(ORDER_STATUS.SERVIR_SOPA) && (
              <button
                onClick={() => onStatusChange(order.id, ORDER_STATUS.SERVIR_SOPA)}
                className="kitchen-btn"
                style={{ backgroundColor: '#f97316', color: 'white' }}
              >
                <Utensils />
                Servir Sopa
              </button>
            )}
            {availableStatuses.includes(ORDER_STATUS.COMPLETADO) && (
              <button
                onClick={() => onStatusChange(order.id, ORDER_STATUS.COMPLETADO)}
                className="kitchen-btn kitchen-btn-green"
              >
                <CheckCircle />
                Listo
              </button>
            )}
            {availableStatuses.includes(ORDER_STATUS.CANCELADO) && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="kitchen-btn kitchen-btn-danger"
              >
                <XCircle />
              </button>
            )}
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Cancelación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro de cancelar el pedido #{order.orderNumber || order.id}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sí
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={(open: boolean) => !open && onCloseDetailModal?.()}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">Pedido #{order.orderNumber || order.id}</span>
                </div>
              </DialogTitle>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary">
                  {getOrderTypeName(order.orderType)}
                </Badge>
                <StatusBadge statusId={order.status} />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                <span className="font-medium">{order.customerName}</span>
                {order.pickupTime && (
                  <span className="font-semibold text-primary">
                    🕐 Recojo: {new Date(order.pickupTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {/* Observation */}
              {order.observation && (
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                  <p className="text-xs text-muted-foreground italic">
                    📝 <strong>Observación:</strong> {order.observation}
                  </p>
                </div>
              )}
            </DialogHeader>
            
            <div className="py-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Productos ({totalQuantity})
              </h4>
              <div className="bg-muted/30 rounded-lg p-3">
                {renderItems(order.items)}
              </div>
            </div>

            {/* Actions in modal */}
            {availableStatuses.length > 0 && (
              <div className="flex gap-2 pt-4 border-t">
                {availableStatuses.includes(ORDER_STATUS.EN_PROGRESO) && (
                  <button
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.EN_PROGRESO);
                      onCloseDetailModal?.();
                    }}
                    className="kitchen-btn kitchen-btn-green"
                  >
                    <Utensils />
                    Preparar
                  </button>
                )}
                {availableStatuses.includes(ORDER_STATUS.SERVIR_SOPA) && (
                  <button
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.SERVIR_SOPA);
                      onCloseDetailModal?.();
                    }}
                    className="kitchen-btn"
                    style={{ backgroundColor: '#f97316', color: 'white' }}
                  >
                    <Utensils />
                    Servir Sopa
                  </button>
                )}
                {availableStatuses.includes(ORDER_STATUS.COMPLETADO) && (
                  <button
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.COMPLETADO);
                      onCloseDetailModal?.();
                    }}
                    className="kitchen-btn kitchen-btn-green"
                  >
                    <CheckCircle />
                    Listo
                  </button>
                )}
                {availableStatuses.includes(ORDER_STATUS.CANCELADO) && (
                  <button
                    onClick={() => {
                      onCloseDetailModal?.();
                      setShowCancelDialog(true);
                    }}
                    className="kitchen-btn kitchen-btn-danger"
                  >
                    <XCircle />
                  </button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}


