import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Plus, Minus, ShoppingCart, X } from "lucide-react";
import { Order } from "./OrderCard";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface CashierOrderFormProps {
  onOrderSubmit: (order: Omit<Order, "id" | "timestamp" | "status">) => void;
  onClose: () => void;
}

const menuItems: MenuItem[] = [
  {
    id: "1",
    name: "Menú Ejecutivo",
    description: "Plato principal + ensalada + bebida + postre",
    price: 15.99,
    category: "Menús"
  },
  {
    id: "2", 
    name: "Menú Saludable",
    description: "Ensalada grande + proteína + bebida natural",
    price: 12.99,
    category: "Menús"
  },
  {
    id: "3",
    name: "Menú Vegetariano",
    description: "Plato vegetariano + ensalada + bebida + postre",
    price: 13.99,
    category: "Menús"
  },
  {
    id: "4",
    name: "Menú del Día",
    description: "Sopa + plato principal + bebida + postre",
    price: 11.99,
    category: "Menús"
  }
];

export function CashierOrderForm({ onOrderSubmit, onClose }: CashierOrderFormProps) {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"takeaway" | "dinein">("dinein");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find(i => i.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  };

  const isFormValid = () => {
    const hasItems = Object.keys(cart).length > 0;
    const hasRequiredName = orderType === "dinein" || (orderType === "takeaway" && customerName.trim());
    return hasItems && hasRequiredName;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);
    
    const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
      const item = menuItems.find(i => i.id === itemId)!;
      return {
        name: item.name,
        quantity,
        price: item.price
      };
    });

    const finalCustomerName = orderType === "dinein" ? `Mesa ${Date.now().toString().slice(-3)}` : customerName.trim();

    const order: Omit<Order, "id" | "timestamp" | "status"> = {
      customerName: finalCustomerName,
      items: orderItems,
      total: getCartTotal(),
      orderType: orderType === "takeaway" ? "takeaway" : "local"
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onOrderSubmit(order);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2>Nuevo Pedido</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Order Type Selection */}
          <Card>
            <CardHeader>
              <h3>Tipo de Pedido</h3>
            </CardHeader>
            <CardContent>
              <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as "takeaway" | "dinein")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dinein" id="dinein" />
                  <Label htmlFor="dinein">Comer en el restaurante</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="takeaway" id="takeaway" />
                  <Label htmlFor="takeaway">Para llevar</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Customer Info */}
          {orderType === "takeaway" && (
            <Card>
              <CardHeader>
                <h3>Información del Cliente</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre del Cliente *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ingresa el nombre del cliente"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {orderType === "dinein" && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Se asignará automáticamente un número de mesa al pedido
                </p>
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          <div className="space-y-4">
            <h3>Seleccionar Menús</h3>
            {menuItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4>{item.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          ${item.price.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {cart[item.id] ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{cart[item.id]}</span>
                          <Button
                            size="sm"
                            onClick={() => addToCart(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item.id)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Summary & Submit */}
        {Object.keys(cart).length > 0 && (
          <div className="sticky bottom-0 bg-background border-t p-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>
                      {getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span>
                    Total: ${getCartTotal().toFixed(2)}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Procesando..." : "Crear Pedido"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}