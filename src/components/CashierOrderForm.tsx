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
  const [orderType, setOrderType] = useState<"takeaway" | "dinein">("dinein");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
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
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
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
      const item = products.find(i => i._id === itemId)!;
      return {
        name: item.name,
        quantity,
        price: item.sellPrice
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
    
    toast({
      title: "Pedido creado",
      description: "El pedido ha sido creado exitosamente.",
    });
    
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
            
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Category Tabs */}
                <Tabs
                  defaultValue="all"
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  className="w-full"
                >
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category._id}
                        value={category._id}
                        className="flex-1 min-w-fit"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value="all" className="flex-1 min-w-fit">
                      Todos
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Products List */}
                <div className="space-y-3 mt-4">
                  {filteredProducts.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No hay productos disponibles en esta categoría.
                      </CardContent>
                    </Card>
                  ) : (
                    filteredProducts.map((product) => (
                      <Card key={product._id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="text-lg font-semibold">{product.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  <Currency amount={product.sellPrice} />
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {product.description || "Producto delicioso"}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {cart[product._id] ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFromCart(product._id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {cart[product._id]}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => addToCart(product._id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(product._id)}
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
                    ))
                  )}
                </div>
              </>
            )}
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
                    Total: <Currency amount={getCartTotal()} />
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