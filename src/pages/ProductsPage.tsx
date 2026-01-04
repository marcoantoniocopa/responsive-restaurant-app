import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ProductForm } from '../components/ProductForm';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw, Search, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Currency } from '../components/Currency';
import '../styles/products.css';

interface Category {
  _id: string;
  name: string;
  description: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  sellPrice: number;
  price?: number;
  categoryId: {
    _id: string;
    name: string;
  };
  isAvailable: boolean;
  isDeleted: boolean;
  isVirtual?: boolean; // Flag for auto-generated completos
  components?: string[]; // Product IDs that make up this completo
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProducts();
      setProducts(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || 'No se pudieron cargar los productos',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiClient.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
    fetchProducts();
      toast({
        variant: 'success',
        title: 'Éxito',
        description: selectedProduct ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
      });
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await apiClient.deleteProduct(productToDelete, 'Deleted by admin');
      toast({
        variant: 'success',
        title: 'Éxito',
        description: 'Producto eliminado exitosamente',
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || 'Error al eliminar el producto',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleToggleAvailability = async (productId: string) => {
    try {
      await apiClient.toggleProductAvailability(productId);
      toast({
        variant: 'success',
        title: 'Éxito',
        description: 'Disponibilidad del producto actualizada',
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || 'Error al actualizar el producto',
      });
    }
  };

  // Filter products by search query and selected category
  const filteredProducts = products.filter((product) => {
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryId?.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Apply category filter
    const matchesCategory = selectedCategory === 'all' || product.categoryId?._id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Count products per category (respecting search filter)
  const getProductCount = (categoryId: string) => {
    return products.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryId?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return p.categoryId?._id === categoryId && matchesSearch;
    }).length;
  };

  // Total count respecting search filter
  const getTotalCount = () => {
    return products.filter(p => {
      return searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryId?.name.toLowerCase().includes(searchQuery.toLowerCase());
    }).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground">Administra los productos de tu restaurante</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchProducts} variant="outline" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={handleAddProduct} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="search-wrapper">
            <div className="search-input-container">
              <div className="search-icon-wrapper">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar productos por nombre, descripción o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="search-clear-btn"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="search-results-text">
                Mostrando {filteredProducts.length} de {products.length} productos
              </p>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length + 1}, minmax(0, 1fr))` }}>
                <TabsTrigger value="all" className="relative">
                  Todos
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] rounded-full">
                    {getTotalCount()}
                  </Badge>
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category._id} value={category._id} className="relative">
                    {category.name}
                    <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] rounded-full">
                      {getProductCount(category._id)}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-6">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? (
                      <>
                        <p className="text-lg">No se encontraron productos que coincidan con "{searchQuery}"</p>
                        <Button 
                          onClick={() => setSearchQuery('')} 
                          variant="outline" 
                          className="mt-4"
                        >
                          Limpiar búsqueda
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Aún no hay productos en esta categoría.</p>
                        <Button onClick={handleAddProduct} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Primer Producto
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table className="products-table">
                      <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead data-align="right">Precio</TableHead>
                        <TableHead data-align="center">Estado</TableHead>
                        <TableHead data-align="center">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell className="font-medium">
                              {product.name}
                              {product.isVirtual && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Auto-generado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {product.description}
                              {product.isVirtual && !product.description && (
                                <span className="text-muted-foreground italic">Combo generado</span>
                              )}
                            </TableCell>
                            <TableCell data-align="right">
                              <span className="products-price">
                                <Currency amount={product.sellPrice} />
                              </span>
                            </TableCell>
                            <TableCell data-align="center">
                              {product.isVirtual ? (
                                <Badge variant="outline">Auto</Badge>
                              ) : (
                                <Badge variant={product.isAvailable ? 'default' : 'secondary'}>
                                  {product.isAvailable ? 'Disponible' : 'No Disponible'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell data-align="center">
                              {product.isVirtual ? (
                                <div className="products-actions">
                                  <span className="text-xs text-muted-foreground italic">
                                    Gestionado en Configuración
                                  </span>
                                </div>
                              ) : (
                                <div className="products-actions">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleAvailability(product._id)}
                                    title={product.isAvailable ? 'Marcar como no disponible' : 'Marcar como disponible'}
                                  >
                                    {product.isAvailable ? (
                                      <ToggleRight className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(product._id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? 'Actualiza la información del producto a continuación'
                : 'Completa la información del producto a continuación'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            categories={categories}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará el producto de forma temporal. El producto será marcado como eliminado pero
              puede ser restaurado más tarde para fines de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar Producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

