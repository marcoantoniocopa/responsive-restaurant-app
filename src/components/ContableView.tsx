import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { 
  RefreshCw, 
  Download, 
  Filter, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Calendar,
  X
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiClient } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Currency } from "./Currency";
import { useConfig } from "../contexts/ConfigContext";
import "../styles/contable.css";

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  orderType: number;
  paymentMethod: number;
  totalPrice: number;
  currentStatus: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isCompleto: boolean;
  }>;
}

interface ContableStats {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    uniqueCustomers: number;
  };
  dailySales: Array<{ date: string; revenue: number; orders: number }>;
  productSales: Array<{ name: string; quantity: number; revenue: number }>;
  orderTypeBreakdown: Array<{ type: number; count: number }>;
  paymentMethodBreakdown: Array<{ method: number; count: number }>;
}

interface Product {
  _id: string;
  name: string;
}

export function ContableView() {
  const [stats, setStats] = useState<ContableStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState("ventas-dia");
  
  const { toast } = useToast();
  const { getPaymentMethodName, getOrderTypeName } = useConfig();

  // Convert local date string (YYYY-MM-DD) to UTC ISO string for start/end of day
  const getLocalDayRangeAsUTC = (fromDate: string, toDate: string) => {
    // Parse date strings as local dates
    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    
    // Create local start of day (00:00:00.000) and convert to UTC
    const startOfDay = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
    
    // Create local end of day (23:59:59.999) and convert to UTC
    const endOfDay = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);
    
    return {
      dateFrom: startOfDay.toISOString(),
      dateTo: endOfDay.toISOString(),
    };
  };

  // Fetch stats from server
  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      // Convert local dates to UTC range
      const { dateFrom: utcDateFrom, dateTo: utcDateTo } = getLocalDayRangeAsUTC(dateFrom, dateTo);

      const params: any = {
        dateFrom: utcDateFrom,
        dateTo: utcDateTo,
      };
      
      if (paymentMethodFilter !== "all") {
        params.paymentMethod = parseInt(paymentMethodFilter);
      }
      if (orderTypeFilter !== "all") {
        params.orderType = parseInt(orderTypeFilter);
      }

      const statsData = await apiClient.getContableStats(params);
      setStats(statsData);

      // Also fetch orders for the table (with same filters + completed status)
      const ordersData = await apiClient.getOrders({
        ...params,
        status: 4, // Only completed orders
        limit: 100,
      });
      setOrders(ordersData || []);

    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch products for filter tags
  const fetchProducts = async () => {
    try {
      const productsData = await apiClient.getProducts();
      setProducts(productsData || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo, paymentMethodFilter, orderTypeFilter]);

  // Filter orders by selected products (client-side since this is a minor filter)
  const filteredOrders = useMemo(() => {
    if (selectedProducts.length === 0) return orders;
    
    return orders.filter(order => {
      const orderProductNames = order.items.map(item => item.productName);
      return selectedProducts.some(productName => 
        orderProductNames.includes(productName)
      );
    });
  }, [orders, selectedProducts]);

  // Format daily sales for chart
  const dailySalesData = useMemo(() => {
    if (!stats?.dailySales) return [];
    
    return stats.dailySales.map(day => ({
      date: new Date(day.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      }),
      revenue: day.revenue,
      orders: day.orders,
    }));
  }, [stats]);

  // Format order type data for chart
  const orderTypeData = useMemo(() => {
    if (!stats?.orderTypeBreakdown) return [];
    
    return stats.orderTypeBreakdown.map(item => ({
      name: getOrderTypeName(item.type),
      value: item.count,
    }));
  }, [stats, getOrderTypeName]);

  // Format payment method data for chart
  const paymentMethodData = useMemo(() => {
    if (!stats?.paymentMethodBreakdown) return [];
    
    return stats.paymentMethodBreakdown.map(item => ({
      name: getPaymentMethodName(item.method),
      value: item.count,
    }));
  }, [stats, getPaymentMethodName]);

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const handleRefresh = () => {
    fetchStats(false);
  };

  const handleClearFilters = () => {
    setPaymentMethodFilter("all");
    setOrderTypeFilter("all");
    setSelectedProducts([]);
  };

  const toggleProductFilter = (productName: string) => {
    setSelectedProducts(prev => 
      prev.includes(productName)
        ? prev.filter(p => p !== productName)
        : [...prev, productName]
    );
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['ID', 'Cliente', 'Fecha', 'Tipo', 'Pago', 'Total'];
    const rows = filteredOrders.map(order => [
      `#${order.orderNumber}`,
      order.customerName,
      new Date(order.createdAt).toLocaleString('es-ES'),
      getOrderTypeName(order.orderType),
      getPaymentMethodName(order.paymentMethod),
      order.totalPrice.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-contable-${dateFrom}-${dateTo}.csv`;
    link.click();
    
    toast({
      title: "Exportado",
      description: "El reporte ha sido descargado",
    });
  };

  // Get unique product names from orders for filter
  const uniqueProductNames = useMemo(() => {
    const names = new Set<string>();
    orders.forEach(order => {
      order.items.forEach(item => names.add(item.productName));
    });
    return Array.from(names).sort();
  }, [orders]);

  if (isLoading) {
    return (
      <div className="contable-loading">
        <RefreshCw className="contable-loading-icon" />
        <p>Cargando datos contables...</p>
      </div>
    );
  }

  return (
    <div className="contable-container">
      {/* Header */}
      <div className="contable-header">
        <h2 className="contable-title">Panel Contable</h2>
        <div className="contable-header-actions">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`btn-icon ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
          >
            <Download className="btn-icon" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="contable-filters-card">
        <CardContent className="contable-filters-content">
          <div className="contable-filters-header">
            <div className="contable-filters-title">
              <Filter className="filter-icon" />
              <span>Filtros</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClearFilters}
              className="clear-filters-btn"
            >
              Limpiar Filtros
            </Button>
          </div>
          
          <div className="contable-filters-grid">
            {/* Date Range */}
            <div className="filter-group">
              <label className="filter-label">Fecha Inicio</label>
              <div className="date-input-wrapper">
                <Calendar className="date-icon" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Fecha Fin</label>
              <div className="date-input-wrapper">
                <Calendar className="date-icon" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
            
            {/* Payment Method */}
            <div className="filter-group">
              <label className="filter-label">Método de Pago</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="filter-select">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Efectivo</SelectItem>
                  <SelectItem value="2">QR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Order Type */}
            <div className="filter-group">
              <label className="filter-label">Tipo de Pedido</label>
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger className="filter-select">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Para Llevar</SelectItem>
                  <SelectItem value="2">En Local</SelectItem>
                  <SelectItem value="3">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Product Filter Tags */}
          {uniqueProductNames.length > 0 && (
            <div className="product-filters">
              <label className="filter-label">Filtrar por Productos</label>
              <div className="product-tags">
                {uniqueProductNames.slice(0, 12).map(name => (
                  <Badge
                    key={name}
                    variant={selectedProducts.includes(name) ? "default" : "outline"}
                    className={`product-tag ${selectedProducts.includes(name) ? 'product-tag-selected' : ''}`}
                    onClick={() => toggleProductFilter(name)}
                  >
                    {name}
                    {selectedProducts.includes(name) && (
                      <X className="product-tag-remove" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="contable-stats-grid">
        <Card className="stat-card-contable">
          <CardContent className="stat-card-content-contable">
            <div className="stat-info">
              <p className="stat-label-contable">Ingresos Totales</p>
              <p className="stat-value-contable">
                <Currency amount={stats?.summary.totalRevenue || 0} />
              </p>
            </div>
            <DollarSign className="stat-icon-contable stat-icon-green" />
          </CardContent>
        </Card>
        
        <Card className="stat-card-contable">
          <CardContent className="stat-card-content-contable">
            <div className="stat-info">
              <p className="stat-label-contable">Total Pedidos</p>
              <p className="stat-value-contable">{stats?.summary.totalOrders || 0}</p>
            </div>
            <ShoppingCart className="stat-icon-contable stat-icon-blue" />
          </CardContent>
        </Card>
        
        <Card className="stat-card-contable">
          <CardContent className="stat-card-content-contable">
            <div className="stat-info">
              <p className="stat-label-contable">Ticket Promedio</p>
              <p className="stat-value-contable">
                <Currency amount={stats?.summary.averageTicket || 0} />
              </p>
            </div>
            <TrendingUp className="stat-icon-contable stat-icon-purple" />
          </CardContent>
        </Card>
        
        <Card className="stat-card-contable">
          <CardContent className="stat-card-content-contable">
            <div className="stat-info">
              <p className="stat-label-contable">Clientes Únicos</p>
              <p className="stat-value-contable">{stats?.summary.uniqueCustomers || 0}</p>
            </div>
            <Users className="stat-icon-contable stat-icon-orange" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Card className="contable-charts-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="contable-tabs-list">
            <TabsTrigger value="ventas-dia">Ventas por Día</TabsTrigger>
            <TabsTrigger value="productos">Productos Más Vendidos</TabsTrigger>
            <TabsTrigger value="tipos">Tipos de Pedido</TabsTrigger>
            <TabsTrigger value="pagos">Métodos de Pago</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ventas-dia" className="chart-content">
            <h3 className="chart-title">Ventas por Día</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="productos" className="chart-content">
            <h3 className="chart-title">Productos Más Vendidos</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.productSales || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#6b7280" 
                    fontSize={12}
                    width={120}
                    tick={{ fill: '#374151' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'quantity' ? value : `$${value.toFixed(2)}`,
                      name === 'quantity' ? 'Cantidad' : 'Ingresos'
                    ]}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="tipos" className="chart-content">
            <h3 className="chart-title">Tipos de Pedido</h3>
            <div className="chart-container pie-chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="pagos" className="chart-content">
            <h3 className="chart-title">Métodos de Pago</h3>
            <div className="chart-container pie-chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Orders Table */}
      <Card className="contable-table-card">
        <CardHeader className="contable-table-header">
          <h3>Detalles de Pedidos ({filteredOrders.length} pedidos)</h3>
        </CardHeader>
        <CardContent>
          <div className="contable-table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.slice(0, 50).map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="table-badge">
                        {getOrderTypeName(order.orderType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="table-badge">
                        {getPaymentMethodName(order.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Currency amount={order.totalPrice} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredOrders.length > 50 && (
              <p className="table-more-info">
                Mostrando 50 de {filteredOrders.length} pedidos
              </p>
            )}
            {filteredOrders.length === 0 && (
              <p className="table-more-info">
                No hay pedidos para mostrar con los filtros seleccionados
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
