import { useState, useEffect } from "react";
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
import { Clock, CheckCircle, XCircle, ChevronDown, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Currency } from "./Currency";
import { useConfig } from "../contexts/ConfigContext";
import { ORDER_STATUS, getAvailableTransitions } from "../constants/orderStatus";

const MAX_VISIBLE_ITEMS = 5;

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  tableNumber?: string;
  observation?: string;
  pickupTime?: Date;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    isCompleto?: boolean;
    components?: string[];
  }>;
  total: number;
  status: number; // Numeric status ID
  timestamp: Date;
  orderType: number; // Numeric order type ID
  paymentMethod: number; // Numeric payment method ID
}

interface OrderCardProps {
  order: Order;
  onStatusChange?: (orderId: string, newStatus: number) => void;
  showActions?: boolean;
  compact?: boolean;
  isDetailModalOpen?: boolean;
  onOpenDetailModal?: (orderId: string) => void;
  onCloseDetailModal?: () => void;
}

export function OrderCard({ 
  order, 
  onStatusChange, 
  showActions = false, 
  compact = false,
  isDetailModalOpen = false,
  onOpenDetailModal,
  onCloseDetailModal,
}: OrderCardProps) {
  const { getOrderTypeName, getPaymentMethodName } = useConfig();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  // Get available next statuses based on current status and order context
  const availableStatuses = getAvailableTransitions(order.status, {
    orderType: order.orderType,
    items: order.items,
  });

  // Check if we need to truncate items
  const hasMoreItems = order.items.length > MAX_VISIBLE_ITEMS;
  const visibleItems = hasMoreItems ? order.items.slice(0, MAX_VISIBLE_ITEMS) : order.items;
  const hiddenItemsCount = order.items.length - MAX_VISIBLE_ITEMS;

  const handleCancelConfirm = () => {
    if (onStatusChange) {
      onStatusChange(order.id, ORDER_STATUS.CANCELADO);
    }
    setShowCancelDialog(false);
  };

  const handleViewMore = () => {
    if (onOpenDetailModal) {
      onOpenDetailModal(order.id);
    }
  };

  const handleDoubleClick = () => {
    if (onOpenDetailModal) {
      onOpenDetailModal(order.id);
    }
  };

  // Keyboard shortcuts for detail modal
  useEffect(() => {
    if (!isDetailModalOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseDetailModal) {
        e.preventDefault();
        onCloseDetailModal();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isDetailModalOpen, onCloseDetailModal]);

  // Render items list (reusable for card and modal)
  const renderItems = (items: Order['items'], isModal = false) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className={`${compact && !isModal ? 'text-sm' : 'text-base'} ${item.isCompleto ? 'font-semibold' : ''}`}>
              {item.quantity}x {item.name}
            </span>
            <span className={`${compact && !isModal ? 'text-sm' : 'text-base'} text-muted-foreground`}>
              <Currency amount={item.price} />
            </span>
          </div>
          {item.isCompleto && item.components && (
            <div className="text-xs text-muted-foreground ml-4">
              {item.components.join(" + ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
    <Card 
      className={`w-full ${compact ? 'mb-2' : 'mb-4'} cursor-pointer`}
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className={`pb-3 ${compact ? 'py-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>
              #{order.orderNumber || order.id}
            </span>
            <Badge variant="secondary" className="text-xs">
              {getOrderTypeName(order.orderType)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formatTime(order.timestamp)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className={compact ? "text-base font-medium" : "text-lg font-medium"}>
            {order.customerName}
          </span>
          <StatusBadge statusId={order.status} />
        </div>
      </CardHeader>
      
      <CardContent className={compact ? 'py-2' : ''}>
        <div className="mb-4">
          {renderItems(visibleItems)}
          
          {/* Show "Ver más" button if there are more items */}
          {hasMoreItems && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewMore}
              className="w-full mt-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Ver {hiddenItemsCount} producto{hiddenItemsCount > 1 ? 's' : ''} más
            </Button>
          )}
        </div>
        
        <div className="flex justify-between items-center border-t pt-3">
          <span className={compact ? "text-base font-semibold" : "text-lg font-semibold"}>Total:</span>
          <span className={`${compact ? 'text-base' : 'text-lg'} font-bold text-primary`}>
            <Currency amount={order.total} large />
          </span>
        </div>
        
        {showActions && onStatusChange && availableStatuses.length > 0 && (
          <div className="flex gap-2 mt-4">
            {availableStatuses.includes(ORDER_STATUS.EN_PROGRESO) && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, ORDER_STATUS.EN_PROGRESO)}
                className="flex-1"
              >
                Iniciar Preparación
              </Button>
            )}
            {availableStatuses.includes(ORDER_STATUS.SERVIR_SOPA) && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, ORDER_STATUS.SERVIR_SOPA)}
                className="flex-1 text-white"
                style={{ backgroundColor: '#f97316' }}
              >
                Servir Sopa
              </Button>
            )}
            {availableStatuses.includes(ORDER_STATUS.COMPLETADO) && (
              <Button
                size="sm"
                onClick={() => onStatusChange(order.id, ORDER_STATUS.COMPLETADO)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar Listo
              </Button>
            )}
            {availableStatuses.includes(ORDER_STATUS.CANCELADO) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
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
        <Dialog open={isDetailModalOpen} onOpenChange={(open) => !open && onCloseDetailModal?.()}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <button
              onClick={onCloseDetailModal}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-8">
                <span className="text-xl">Pedido #{order.orderNumber || order.id}</span>
                <Badge variant="secondary" className="text-xs">
                  {getOrderTypeName(order.orderType)}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Customer and Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <div className="mt-1">
                    <StatusBadge statusId={order.status} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Hora de Pedido</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{formatTime(order.timestamp)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Método de Pago</p>
                  <p className="font-medium">{getPaymentMethodName(order.paymentMethod)}</p>
                </div>
              </div>

              {/* Pickup Time */}
              {order.pickupTime && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Hora de Recojo</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">
                      {formatTime(order.pickupTime)}
                    </span>
                  </div>
                </div>
              )}

              {/* Observation */}
              {order.observation && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                  <p className="text-sm italic">{order.observation}</p>
                </div>
              )}

              {/* Products */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Productos ({order.items.length})</h4>
                <div className="bg-muted/30 rounded-lg p-3">
                  {renderItems(order.items, true)}
                </div>
              </div>
              
              {/* Total */}
              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-primary">
                  <Currency amount={order.total} large />
                </span>
              </div>
            </div>

            {/* Actions in modal */}
            {showActions && onStatusChange && availableStatuses.length > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {availableStatuses.includes(ORDER_STATUS.EN_PROGRESO) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.EN_PROGRESO);
                      onCloseDetailModal?.();
                    }}
                    className="flex-1"
                  >
                    Iniciar Preparación
                  </Button>
                )}
                {availableStatuses.includes(ORDER_STATUS.SERVIR_SOPA) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.SERVIR_SOPA);
                      onCloseDetailModal?.();
                    }}
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#f97316' }}
                  >
                    Servir Sopa
                  </Button>
                )}
                {availableStatuses.includes(ORDER_STATUS.COMPLETADO) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onStatusChange(order.id, ORDER_STATUS.COMPLETADO);
                      onCloseDetailModal?.();
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marcar Listo
                  </Button>
                )}
                {availableStatuses.includes(ORDER_STATUS.CANCELADO) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onCloseDetailModal?.();
                      setShowCancelDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </>
  );
}