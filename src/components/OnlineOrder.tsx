import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { Order } from "./OrderCard";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface OnlineOrderProps {
  onOrderSubmit: (order: Omit<Order, "id" | "timestamp" | "status">) => void;
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

export function OnlineOrder({ onOrderSubmit }: OnlineOrderProps) {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
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

  const handleSubmit = async () => {
    if (!customerName.trim() || Object.keys(cart).length === 0) {
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

    const order: Omit<Order, "id" | "timestamp" | "status"> = {
      customerName: customerName.trim(),
      items: orderItems,
      total: getCartTotal(),
      orderType: "online"
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onOrderSubmit(order);
    
    // Reset form
    setCart({});
    setCustomerName("");
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="text-center mb-6">
        <h2 className="mb-2">Realizar Pedido Online</h2>
        <p className="text-muted-foreground">
          Selecciona tus menús favoritos y realiza tu pedido
        </p>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <h3>Información del Cliente</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="customerName">Nombre del Cliente</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ingresa tu nombre"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div className="space-y-4">
        <h3>Nuestros Menús</h3>
        {menuItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg">{item.name}</h4>
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

      {/* Cart Summary & Submit */}
      {Object.keys(cart).length > 0 && (
        <Card className="sticky bottom-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>
                  {getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="text-lg">
                Total: ${getCartTotal().toFixed(2)}
              </span>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!customerName.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Pedido"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}