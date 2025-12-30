import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";
import { Order } from "./OrderCard";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Currency } from "./Currency";
import "../styles/order-form.css";
import "../styles/form-fields.css";

interface Product {
  _id: string;
  name: string;
  description: string;
  sellPrice: number;
  categoryId: {
    _id: string;
    name: string;
  };
  isAvailable: boolean;
  isVirtual?: boolean;
  components?: string[];  // Array of product IDs for virtual completo products
}

interface Category {
  _id: string;
  name: string;
}

interface OnlineOrderProps {
  onOrderSubmit: (order: Omit<Order, "id" | "timestamp" | "status">) => void;
}

export function OnlineOrder({ onOrderSubmit }: OnlineOrderProps) {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [observation, setObservation] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Generate time slots from 11:00 to 15:00 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 11;
    const endHour = 15;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === endHour && minute > 0) break; // Stop at 15:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Convert time slot to full datetime
  const getPickupDateTime = () => {
    if (!pickupTimeSlot) return undefined;
    
    const today = new Date();
    const [hours, minutes] = pickupTimeSlot.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return today.toISOString();
  };
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCategories(),
        ]);
        
        // Filter only available products
        const availableProducts = Array.isArray(productsData)
          ? productsData.filter((product: Product) => product.isAvailable)
          : [];
        
        // Sort categories: Completo first, then others alphabetically
        const sortedCategories = Array.isArray(categoriesData)
          ? [...categoriesData].sort((a, b) => {
              if (a.name === "Completo") return -1;
              if (b.name === "Completo") return 1;
              return a.name.localeCompare(b.name);
            })
          : [];
        
        setProducts(availableProducts);
        setCategories(sortedCategories);
        
        // Default to Completo category if exists
        const completoCategory = sortedCategories.find(c => c.name === "Completo");
        if (completoCategory) {
          setSelectedCategory(completoCategory._id);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los productos. Por favor, intente nuevamente.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(
        (product) => product.categoryId?._id === selectedCategory
      );

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
      const item = products.find(i => i._id === itemId);
      return total + (item ? item.sellPrice * quantity : 0);
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
    
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = products.find(i => i._id === itemId)!;
        
        // Handle Completo (virtual) products
        if (item.isVirtual && item.components) {
          return {
            productName: item.name,
            quantity,
            unitPrice: item.sellPrice,
            isCompleto: true,
            completoComponents: item.components.map(compId => {
              const component = products.find(p => p._id === compId);
              return {
                productId: compId,
                productName: component?.name || 'Desconocido'
              };
            })
          };
        }
        
        // Handle Single products
        return {
          productId: itemId,
          productName: item.name,
          quantity,
          unitPrice: item.sellPrice,
          isCompleto: false
        };
      });

      // Create order via API
      const orderData = {
        customerName: customerName.trim(),
        items: orderItems,
        paymentMethod: 1,  // 1 = Efectivo (default for online orders)
        orderType: 3,      // 3 = Llevar Web (online takeaway)
        isReservation: true,
        reservationTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),  // 30 minutes from now
        observation: observation.trim() || undefined,
        pickupTime: getPickupDateTime(),
      };

      await apiClient.createCustomerOrder(orderData);
      
      toast({
        variant: "success",
        title: "Pedido confirmado",
        description: "Tu pedido ha sido recibido exitosamente.",
      });
      
      // Reset form
      setCart({});
      setCustomerName("");
      setObservation("");
    } catch (error: any) {
      console.error("Failed to create order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Error al crear el pedido. Por favor, intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="order-container">
      <div className="order-header">
        <h2>Realizar Pedido Online</h2>
        <p className="order-header-subtitle">
          Selecciona tus menús favoritos y realiza tu pedido
        </p>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <h3>Información del Cliente</h3>
        </CardHeader>
        <CardContent className="form-fields-group">
          <div className="form-field">
            <Label htmlFor="customerName" className="form-label form-label--required">Nombre del Cliente</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ingresa tu nombre"
              className="input-field"
            />
          </div>
          <div className="form-field">
            <Label htmlFor="observation" className="form-label">Observaciones (opcional)</Label>
            <textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ej: Sin cebolla, extra picante..."
              className="textarea-field textarea-field--optional"
              rows={2}
              maxLength={250}
            />
          </div>
          <div className="form-field">
            <Label htmlFor="pickupTime" className="form-label">Hora de recojo (opcional)</Label>
            <select
              id="pickupTime"
              value={pickupTimeSlot}
              onChange={(e) => setPickupTimeSlot(e.target.value)}
              className="input-field input-field--optional"
            >
              <option value="">Selecciona una hora</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            {pickupTimeSlot && (
              <p className="text-xs text-muted-foreground mt-1">
                Recojo hoy a las {pickupTimeSlot}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <div>
        <h3 className="order-section-title">Menú del día</h3>
        
        {isLoading ? (
          <div className="loading-state">
            <Loader2 className="loading-spinner" />
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            <Tabs
              defaultValue="all"
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className="category-tabs"
            >
              <TabsList className="category-tabs-list">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category._id}
                    value={category._id}
                    className="category-tab"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="all" className="category-tab">
                  Todos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Products List */}
            <div className="products-list">
              {filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="empty-state">
                    No hay productos disponibles en esta categoría.
                  </CardContent>
                </Card>
              ) : (
                filteredProducts.map((product) => (
                  <Card key={product._id}>
                    <CardContent className="product-card">
                      <div className="product-card-content">
                        <div className="product-info">
                          <div className="product-header">
                            <h4 className="product-name">{product.name}</h4>
                            <Badge variant="secondary" className="product-price-badge">
                              <Currency amount={product.sellPrice} />
                            </Badge>
                          </div>
                          <p className="product-description">
                            {product.description || "Producto delicioso"}
                          </p>
                        </div>
                        
                        <div className="product-actions">
                          {cart[product._id] ? (
                            <div className="quantity-controls">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(product._id)}
                                className="quantity-btn"
                              >
                                <Minus className="quantity-btn-icon" />
                              </Button>
                              <span className="quantity-value">
                                {cart[product._id]}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(product._id)}
                                className="quantity-btn"
                              >
                                <Plus className="quantity-btn-icon" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(product._id)}
                              className="add-btn"
                            >
                              <Plus className="add-btn-icon" />
                              Agregar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Cart Summary & Submit */}
      {Object.keys(cart).length > 0 && (
        <Card className="cart-summary">
          <CardContent className="cart-summary-content">
            <div className="cart-info">
              <div className="cart-items-count">
                <ShoppingCart className="cart-icon" />
                <span>
                  {getCartItemCount()} {getCartItemCount() === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <span className="cart-total">
                Total: <Currency amount={getCartTotal()} />
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