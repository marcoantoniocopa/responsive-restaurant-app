import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Minus, ShoppingCart, X, Loader2 } from "lucide-react";
import { Order } from "./OrderCard";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Currency } from "./Currency";
import { useSettings } from "../contexts/SettingsContext";
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

interface CashierOrderFormProps {
  onOrderSubmit: (order: Omit<Order, "id" | "timestamp" | "status">) => void;
  onClose: () => void;
}

export function CashierOrderForm({ onOrderSubmit, onClose }: CashierOrderFormProps) {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<"takeaway" | "dinein">("dinein");
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
  const { numberOfTables } = useSettings();

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
        console.error("Error al cargar los datos:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al cargar los productos. Por favor, intente nuevamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Reset table number when switching to takeaway
  useEffect(() => {
    if (orderType === "Llevar") {
      setTableNumber(null);
    }
  }, [orderType]);

  const filteredProducts = selectedCategory === "todo"
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

  const isFormValid = () => {
    const hasItems = Object.keys(cart).length > 0;
    const hasRequiredInfo = orderType === "dinein" 
      ? tableNumber !== null 
      : customerName.trim() !== "";
    return hasItems && hasRequiredInfo;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
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
        customerName: orderType === "Llevar" ? customerName.trim() : `Mesa ${tableNumber}`,
        tableNumber: orderType === "dinein" ? tableNumber?.toString() : undefined,
      items: orderItems,
        paymentMethod: 1,  // 1 = Efectivo (default for cashier orders)
        orderType: orderType === "Llevar" ? 1 : 2,  // 1 = Llevar, 2 = En Local
        isReservation: false,
        observation: observation.trim() || undefined,
        pickupTime: getPickupDateTime(),
      };

      await apiClient.createOrder(orderData);
      
      toast({
        variant: "success",
        title: "Pedido creado",
        description: "El pedido ha sido creado exitosamente.",
      });
      
      // Reset form
      setCart({});
      setCustomerName("");
      setTableNumber(null);
      setObservation("");
      
    onClose();
    } catch (error: any) {
      console.error("Error al crear el pedido:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Error al crear el pedido. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Nuevo Pedido</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="modal-close-btn">
            <X className="icon-sm" />
          </Button>
        </div>

        <div className="modal-content">
          {/* Order Type Selection */}
          <Card>
            <CardHeader>
              <h3>Tipo de Pedido</h3>
            </CardHeader>
            <CardContent>
              <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as "takeaway" | "dinein")} className="radio-group">
                <div className="radio-option">
                  <RadioGroupItem value="dinein" id="dinein" />
                  <Label htmlFor="dinein">Comer en el restaurante</Label>
                </div>
                <div className="radio-option">
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
              <CardContent className="form-fields-group">
                <div className="form-field">
                  <Label htmlFor="customerName" className="form-label form-label--required">Nombre del Cliente</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ingresa el nombre del cliente"
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
          )}

          {orderType === "dinein" && (
            <Card>
              <CardHeader>
                <h3>Seleccionar Mesa</h3>
              </CardHeader>
              <CardContent className="form-fields-group">
                <div className="table-grid">
                  {Array.from({ length: numberOfTables }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={tableNumber === num ? "default" : "outline"}
                      onClick={() => setTableNumber(num)}
                      className="table-btn"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                {tableNumber && (
                  <p className="table-selected-info">
                    Mesa seleccionada: <span className="table-selected-number">{tableNumber}</span>
                  </p>
                )}
                <div className="form-field">
                  <Label htmlFor="observation-dinein" className="form-label">Observaciones (opcional)</Label>
                  <textarea
                    id="observation-dinein"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Ej: Sin cebolla, extra picante..."
                    className="textarea-field textarea-field--optional"
                    rows={2}
                    maxLength={250}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          <div>
            <h3 className="order-section-title">Seleccionar Menús</h3>
            
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
        </div>

        {/* Cart Summary & Submit */}
        {Object.keys(cart).length > 0 && (
          <div className="modal-footer">
            <Card>
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
                
                <div className="form-buttons">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="form-btn"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || isSubmitting}
                    className="form-btn"
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