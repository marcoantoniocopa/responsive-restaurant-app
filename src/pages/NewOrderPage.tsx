import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Minus, ShoppingCart, X, Loader2, ArrowLeft } from "lucide-react";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Currency } from "../components/Currency";
import { useSettings } from "../contexts/SettingsContext";
import "../styles/order-form.css";
import "../styles/form-fields.css";
import "../styles/new-order.css";

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
  components?: string[];
}

interface Category {
  _id: string;
  name: string;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<"takeaway" | "dinein">("dinein");
  const [observation, setObservation] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<number>(1);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const { numberOfTables } = useSettings();

  // Generate time slots from 11:00 to 15:00 in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 11;
    const endHour = 15;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === endHour && minute > 0) break;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getPickupDateTime = () => {
    if (!pickupTimeSlot) return undefined;
    
    const today = new Date();
    const [hours, minutes] = pickupTimeSlot.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return today.toISOString();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCategories(),
        ]);
        
        const availableProducts = Array.isArray(productsData)
          ? productsData.filter((product: Product) => product.isAvailable)
          : [];
        
        const sortedCategories = Array.isArray(categoriesData)
          ? [...categoriesData]
              // Filter out Guarniciones category (not shown in order creation)
              .filter((c: Category) => c.name !== "Guarniciones")
              .sort((a, b) => {
                if (a.name === "Completo") return -1;
                if (b.name === "Completo") return 1;
                return a.name.localeCompare(b.name);
              })
          : [];
        
        setProducts(availableProducts);
        setCategories(sortedCategories);
        
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
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    if (orderType === "takeaway") {
      setTableNumber(null);
    }
  }, [orderType]);

  // Keyboard shortcuts for payment modal
  useEffect(() => {
    if (!showPaymentModal) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPaymentModal(false);
      } else if (e.key === "Enter" && !isSubmitting) {
        e.preventDefault();
        handleConfirmPayment();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showPaymentModal, isSubmitting, paymentMethod, cashReceived]);

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((product) => product.categoryId?._id === selectedCategory);

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

  const handleOpenPaymentModal = () => {
    if (!isFormValid()) {
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    // Validate cash payment
    if (paymentMethod === 1) {
      const received = parseFloat(cashReceived);
      if (!cashReceived || isNaN(received) || received < getCartTotal()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El monto recibido debe ser mayor o igual al total del pedido.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = products.find(i => i._id === itemId)!;
        
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
        
        return {
          productId: itemId,
          productName: item.name,
          quantity,
          unitPrice: item.sellPrice,
          isCompleto: false
        };
      });

      const orderData = {
        customerName: orderType === "takeaway" ? customerName.trim() : `Mesa ${tableNumber}`,
        tableNumber: orderType === "dinein" ? tableNumber?.toString() : undefined,
        items: orderItems,
        paymentMethod: paymentMethod,
        orderType: orderType === "takeaway" ? 1 : 2,
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
      
      // Navigate back to cashier page
      navigate("/caja");
    } catch (error: any) {
      console.error("Error al crear el pedido:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Error al crear el pedido. Por favor, intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChange = () => {
    const received = parseFloat(cashReceived);
    if (!cashReceived || isNaN(received)) return 0;
    return received - getCartTotal();
  };

  const handleCancel = () => {
    navigate("/caja");
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <h1 className="text-xl font-bold">Nuevo Pedido</h1>
            </div>
            
            {Object.keys(cart).length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  <span>
                    {getCartItemCount()} {getCartItemCount() === 1 ? 'producto' : 'productos'}
                  </span>
                  <span className="font-semibold">
                    <Currency amount={getCartTotal()} />
                  </span>
                </div>
                <Button
                  onClick={handleOpenPaymentModal}
                  disabled={!isFormValid()}
                  size="sm"
                >
                  Crear Pedido
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="max-w-[1400px] w-full flex">
          {/* Left Column - 30% - Order Details */}
          <div className="w-[30%] overflow-y-auto border-r p-4 space-y-4">
            {/* Order Type */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-sm">Tipo de Pedido</h3>
              </CardHeader>
              <CardContent className="order-type-radio-group space-y-3">
                <div 
                  className={`radio-item ${orderType === "dinein" ? "selected" : ""}`}
                  onClick={() => setOrderType("dinein")}
                >
                  <div className="flex items-center gap-4">
                    <div className="radio-indicator" />
                    <Label className="cursor-pointer text-sm font-medium flex-1">En el restaurante</Label>
                  </div>
                </div>
                <div 
                  className={`radio-item ${orderType === "takeaway" ? "selected" : ""}`}
                  onClick={() => setOrderType("takeaway")}
                >
                  <div className="flex items-center gap-4">
                    <div className="radio-indicator" />
                    <Label className="cursor-pointer text-sm font-medium flex-1">Para llevar</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info - Takeaway */}
            {orderType === "takeaway" && (
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-sm">Información del Cliente</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-xs font-medium">
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="observation" className="text-xs font-medium">
                      Observaciones
                    </Label>
                    <textarea
                      id="observation"
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Sin cebolla, extra picante..."
                      className="observation-field w-full mt-1 px-2 py-1.5 rounded-md text-xs resize-none"
                      rows={2}
                      maxLength={250}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickupTime" className="text-xs font-medium">
                      Hora de recojo
                    </Label>
                    <select
                      id="pickupTime"
                      value={pickupTimeSlot}
                      onChange={(e) => setPickupTimeSlot(e.target.value)}
                      className="w-full mt-1 h-9 px-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

            {/* Table Selection - Dine-in */}
            {orderType === "dinein" && (
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-sm">Seleccionar Mesa</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: numberOfTables }, (_, i) => i + 1).map((num) => (
                      <Button
                        key={num}
                        variant={tableNumber === num ? "default" : "outline"}
                        onClick={() => setTableNumber(num)}
                        className={`h-9 text-sm ${tableNumber === num ? "table-button-selected" : ""}`}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                  {tableNumber && (
                    <p className="text-xs text-center font-medium">
                      Mesa: <span className="text-primary">{tableNumber}</span>
                    </p>
                  )}
                  <div className="pt-3">
                    <Label htmlFor="observation-dinein" className="text-xs font-medium">
                      Observaciones
                    </Label>
                    <textarea
                      id="observation-dinein"
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Sin cebolla, extra picante..."
                      className="observation-field w-full mt-1 px-2 py-1.5 rounded-md text-xs resize-none"
                      rows={2}
                      maxLength={250}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - 70% - Products */}
          <div className="w-[70%] overflow-y-auto p-4 products-column">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Category Tabs */}
                  <Tabs
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                      {categories.map((category) => (
                        <TabsTrigger
                          key={category._id}
                          value={category._id}
                        >
                          {category.name}
                        </TabsTrigger>
                      ))}
                      <TabsTrigger value="all">
                        Todos
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No hay productos disponibles en esta categoría.
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <Card key={product._id}>
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm truncate flex-1">
                                  {product.name}
                                </h4>
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  <Currency amount={product.sellPrice} />
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {product.description || "Producto delicioso"}
                              </p>
                              
                              <div className="flex justify-end">
                                {cart[product._id] ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeFromCart(product._id)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-semibold min-w-[1.5rem] text-center">
                                      {cart[product._id]}
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => addToCart(product._id)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(product._id)}
                                    className="h-7 text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
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
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={() => !isSubmitting && setShowPaymentModal(false)}>
          <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="payment-modal-header">Método de Pago</h2>
            
            <div className="payment-radio-group">
              {/* Cash Option */}
              <div 
                className={`payment-method-option ${paymentMethod === 1 ? "selected" : ""}`}
                onClick={() => {
                  setPaymentMethod(1);
                  setCashReceived("");
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Efectivo</span>
                  <div className="radio-indicator" />
                </div>
              </div>

              {/* QR Option */}
              <div 
                className={`payment-method-option ${paymentMethod === 2 ? "selected" : ""}`}
                onClick={() => {
                  setPaymentMethod(2);
                  setCashReceived("");
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">QR</span>
                  <div className="radio-indicator" />
                </div>
              </div>
            </div>

            {/* Cash Input Section */}
            {paymentMethod === 1 && (
              <div className="cash-input-section">
                <Label htmlFor="cashReceived" className="text-sm font-medium mb-2 block">
                  Monto Recibido
                </Label>
                <Input
                  id="cashReceived"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="text-lg text-center font-semibold"
                  autoFocus
                />
                
                {/* Total */}
                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                  <span>Total del pedido:</span>
                  <span className="font-semibold">
                    <Currency amount={getCartTotal()} />
                  </span>
                </div>

                {/* Change */}
                {cashReceived && parseFloat(cashReceived) > 0 && (
                  <div className={`change-display ${getChange() >= 0 ? 'positive' : 'negative'}`}>
                    {getChange() >= 0 ? (
                      <>Cambio: <Currency amount={getChange()} /></>
                    ) : (
                      <>Falta: <Currency amount={Math.abs(getChange())} /></>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QR Info */}
            {paymentMethod === 2 && (
              <div className="mt-3 p-3 bg-muted rounded-md text-sm text-center text-muted-foreground">
                Total a cobrar: <span className="font-semibold text-foreground"><Currency amount={getCartTotal()} /></span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

