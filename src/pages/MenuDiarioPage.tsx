import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { apiClient } from '../lib/api';
import { Plus, Calendar, Check, X, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import '../styles/menu-diario.css';

interface Product {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;
}

interface CategoryWithProducts {
  categoryId: string;
  categoryName: string;
  order: number;
  quantity: number;
  products: Product[];
}

interface SelectedProduct {
  _id: string;
  name: string;
  description?: string;
}

interface SegundoGuarniciones {
  segundoProductId: string;
  segundoProductName: string;
  guarniciones: Array<{ _id: string; name: string }> | string[];
}

interface CategorySelection {
  categoryId: string;
  categoryName: string;
  selectedProducts: SelectedProduct[] | string[];
}

interface DailyMenu {
  _id: string;
  date: string;
  isEnabled: boolean;
  categorySelections: CategorySelection[];
  segundoGuarniciones: SegundoGuarniciones[];
  createdAt: string;
}

// Helper to get product ID from either populated object or string
const getProductId = (product: SelectedProduct | string): string => {
  if (typeof product === 'string') return product;
  return product._id;
};

// Helper to get product name from populated object
const getProductName = (product: SelectedProduct | string): string => {
  if (typeof product === 'string') return product;
  return product.name;
};

// Helper to get guarnicion ID
const getGuarnicionId = (g: { _id: string; name: string } | string): string => {
  if (typeof g === 'string') return g;
  return g._id;
};

// Helper to get guarnicion name
const getGuarnicionName = (g: { _id: string; name: string } | string): string => {
  if (typeof g === 'string') return g;
  return g.name;
};

export function MenuDiarioPage() {
  const { toast } = useToast();
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [guarnicionesProducts, setGuarnicionesProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showGuarnicionesModal, setShowGuarnicionesModal] = useState(false);
  const [currentSegundoForGuarniciones, setCurrentSegundoForGuarniciones] = useState<{id: string; name: string} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  // Guarniciones per segundo: { segundoProductId: guarnicionIds[] }
  const [segundoGuarniciones, setSegundoGuarniciones] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'past' | 'enabled' | 'disabled'>('enabled');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get the date portion from a UTC date string (YYYY-MM-DD)
  const getDatePortion = (dateString: string): string => {
    // Extract just the date portion from UTC string (first 10 chars)
    return dateString.substring(0, 10);
  };

  // Check if a date is today
  const isToday = (dateString: string) => {
    const today = getTodayString();
    const menuDate = getDatePortion(dateString);
    return menuDate === today;
  };

  // Check if a date is in the past
  const isPastDate = (dateString: string) => {
    const today = getTodayString();
    const menuDate = getDatePortion(dateString);
    return menuDate < today;
  };

  // Format date for display (converts UTC to local display)
  const formatDate = (dateString: string) => {
    // Parse the UTC date and display in local timezone
    const datePortion = getDatePortion(dateString);
    const [year, month, day] = datePortion.split('-').map(Number);
    // Create date at noon local time for display to avoid date shifting
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Fetch data
  // Fetch menus with pagination
  const fetchMenus = async (page = currentPage, limit = pageSize, order = sortOrder, status = statusFilter) => {
    try {
      const response = await apiClient.getPaginatedDailyMenus({
        page,
        limit,
        sortOrder: order,
        status
      });

      setMenus(response.data || []);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        setCurrentPage(response.pagination.page);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los menús'
      });
    }
  };

  // Fetch categories and guarniciones (only once)
  const fetchFormData = async () => {
    try {
      const [categoriesResponse, guarnicionesResponse] = await Promise.all([
        apiClient.getDailyMenuCategories(),
        apiClient.getDailyMenuGuarniciones()
      ]);

      setCategories(categoriesResponse.data || []);
      setGuarnicionesProducts(guarnicionesResponse.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los datos del formulario'
      });
    }
  };

  // Initial data fetch
  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMenus(1, pageSize, sortOrder, statusFilter),
        fetchFormData()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch menus when pagination/filters change
  useEffect(() => {
    if (!isLoading) {
      fetchMenus(currentPage, pageSize, sortOrder, statusFilter);
    }
  }, [currentPage, pageSize, sortOrder, statusFilter]);

  // Reset form
  const resetForm = () => {
    setSelectedDate('');
    setSelections({});
    setSegundoGuarniciones({});
    setCurrentSegundoForGuarniciones(null);
    setShowGuarnicionesModal(false);
    setIsCreating(false);
    setIsEditing(null);
  };

  // Start creating new menu
  const handleStartCreate = () => {
    resetForm();
    setSelectedDate(getTodayString());
    // Initialize empty selections for each category
    const initialSelections: Record<string, string[]> = {};
    categories.forEach(cat => {
      initialSelections[cat.categoryId] = [];
    });
    setSelections(initialSelections);
    setSegundoGuarniciones({});
    setIsCreating(true);
  };

  // Start editing menu
  const handleStartEdit = (menu: DailyMenu) => {
    if (isPastDate(menu.date)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se puede editar un menú de una fecha pasada'
      });
      return;
    }

    setIsEditing(menu._id);
    setSelectedDate(getDatePortion(menu.date));
    
    // Populate selections from menu - handle both populated and non-populated products
    const menuSelections: Record<string, string[]> = {};
    categories.forEach(cat => {
      const categorySelection = menu.categorySelections.find(
        cs => cs.categoryId === cat.categoryId
      );
      // Extract IDs from products (could be objects or strings)
      const productIds = (categorySelection?.selectedProducts || []).map(p => getProductId(p));
      menuSelections[cat.categoryId] = productIds;
    });
    setSelections(menuSelections);
    
    // Populate segundo guarniciones
    const guarnicionesMap: Record<string, string[]> = {};
    (menu.segundoGuarniciones || []).forEach(sg => {
      const guarnicionIds = (sg.guarniciones || []).map(g => getGuarnicionId(g));
      guarnicionesMap[sg.segundoProductId] = guarnicionIds;
    });
    setSegundoGuarniciones(guarnicionesMap);
    setIsCreating(true);
  };

  // Toggle product selection
  const toggleProductSelection = (categoryId: string, productId: string) => {
    setSelections(prev => {
      const currentSelection = prev[categoryId] || [];
      const isSelected = currentSelection.includes(productId);
      
      return {
        ...prev,
        [categoryId]: isSelected
          ? currentSelection.filter(id => id !== productId)
          : [...currentSelection, productId]
      };
    });
  };

  // Toggle guarnicion selection for a specific segundo
  const toggleGuarnicionSelection = (segundoId: string, guarnicionId: string) => {
    setSegundoGuarniciones(prev => {
      const currentSelection = prev[segundoId] || [];
      const isSelected = currentSelection.includes(guarnicionId);
      return {
        ...prev,
        [segundoId]: isSelected
          ? currentSelection.filter(id => id !== guarnicionId)
          : [...currentSelection, guarnicionId]
      };
    });
  };

  // Get selected segundos with their names
  const getSelectedSegundos = (): Array<{id: string; name: string}> => {
    const segundoCategory = categories.find(c => c.categoryName.toLowerCase() === 'segundo');
    if (!segundoCategory) return [];
    const selectedIds = selections[segundoCategory.categoryId] || [];
    return selectedIds.map(id => {
      const product = segundoCategory.products.find(p => p.id === id);
      return { id, name: product?.name || id };
    });
  };

  // Check if all segundos have guarniciones selected
  const allSegundosHaveGuarniciones = () => {
    const selectedSegundos = getSelectedSegundos();
    if (selectedSegundos.length === 0) return true;
    return selectedSegundos.every(s => (segundoGuarniciones[s.id] || []).length > 0);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate date
    if (!selectedDate) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Seleccione una fecha'
      });
      return;
    }

    // Check if at least one product is selected
    const totalSelected = Object.values(selections).reduce((sum, arr) => sum + arr.length, 0);
    if (totalSelected === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Seleccione al menos un producto'
      });
      return;
    }

    // If segundos have no guarniciones, show modal for first one without
    const selectedSegundos = getSelectedSegundos();
    const segundoWithoutGuarniciones = selectedSegundos.find(s => (segundoGuarniciones[s.id] || []).length === 0);
    if (segundoWithoutGuarniciones) {
      setCurrentSegundoForGuarniciones(segundoWithoutGuarniciones);
      setShowGuarnicionesModal(true);
      return;
    }

    await saveMenu();
  };

  // Save menu
  const saveMenu = async () => {
    setIsSaving(true);
    try {
      const categorySelections = categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        selectedProducts: selections[cat.categoryId] || []
      })).filter(cs => cs.selectedProducts.length > 0);

      // Build segundoGuarniciones array
      const selectedSegundos = getSelectedSegundos();
      const segundoGuarnicionesArray = selectedSegundos.map(s => ({
        segundoProductId: s.id,
        segundoProductName: s.name,
        guarniciones: segundoGuarniciones[s.id] || []
      })).filter(sg => sg.guarniciones.length > 0);

      // Create date at UTC midnight (YYYY-MM-DDT00:00:00.000Z)
      const dateUTC = `${selectedDate}T00:00:00.000Z`;

      const payload = {
        date: dateUTC,
        categorySelections,
        segundoGuarniciones: segundoGuarnicionesArray
      };

      if (isEditing) {
        await apiClient.updateDailyMenu(isEditing, payload);
        toast({
          variant: 'success',
          title: 'Éxito',
          description: 'Menú actualizado correctamente'
        });
      } else {
        await apiClient.createDailyMenu(payload);
        toast({
          variant: 'success',
          title: 'Éxito',
          description: 'Menú creado correctamente'
        });
      }

      resetForm();
      setShowGuarnicionesModal(false);
      await fetchMenus();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || error.response?.data?.message || 'No se pudo guardar el menú'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle menu enabled status
  const handleToggleEnabled = async (menuId: string) => {
    try {
      await apiClient.toggleDailyMenuEnabled(menuId);
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        description: 'El estado del menú ha sido actualizado'
      });
      await fetchMenus();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || error.response?.data?.message || 'No se pudo actualizar el estado'
      });
    }
  };

  // Delete menu
  const handleDelete = async () => {
    if (!showDeleteDialog) return;

    try {
      await apiClient.deleteDailyMenu(showDeleteDialog);
      toast({
        variant: 'success',
        title: 'Eliminado',
        description: 'Menú eliminado correctamente'
      });
      setShowDeleteDialog(null);
      await fetchMenus();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || error.response?.data?.message || 'No se pudo eliminar el menú'
      });
    }
  };

  // Apply today's menu manually
  const handleApplyTodaysMenu = async () => {
    setIsApplying(true);
    try {
      const result = await apiClient.applyTodaysMenu();
      toast({
        variant: 'success',
        title: 'Menú Aplicado',
        description: result.message
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || error.response?.data?.message || 'No se pudo aplicar el menú'
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="menu-diario-container">
        <div className="loading-container">
          <Loader2 className="loading-spinner" />
        </div>
      </div>
    );
  }

  // Render create/edit form
  if (isCreating) {
    return (
      <div className="menu-diario-container">
        <div className="menu-form-container">
          <div className="menu-form-header">
            <div>
              <h2 className="menu-form-title">
                {isEditing ? 'Editar Menú Diario' : 'Crear Nuevo Menú Diario'}
              </h2>
            </div>
            <Button variant="ghost" onClick={resetForm}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>

          {/* Date Picker */}
          <div className="date-picker-container">
            <label className="date-picker-label">Fecha del Menú</label>
            <input
              type="date"
              className="date-picker-input"
              value={selectedDate}
              min={getTodayString()}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={!!isEditing}
            />
          </div>

          {/* Category Selections */}
          {categories.map((category) => (
            <div key={category.categoryId} className="category-selection">
              <div className="category-selection-header">
                <div>
                  <h3 className="category-selection-title">{category.categoryName}</h3>
                  <p className="category-selection-subtitle">
                    Seleccione los productos disponibles
                  </p>
                </div>
                {(selections[category.categoryId] || []).length > 0 && (
                  <span className="category-badge">
                    <Check className="h-3 w-3" />
                    {(selections[category.categoryId] || []).length} seleccionados
                  </span>
                )}
              </div>

              <div className="products-grid">
                {category.products.map((product) => {
                  const isSelected = (selections[category.categoryId] || []).includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`product-checkbox ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleProductSelection(category.categoryId, product.id)}
                    >
                      <div className="product-checkbox-indicator">
                        {isSelected && <Check />}
                      </div>
                      <span className="product-checkbox-label">{product.name}</span>
                    </div>
                  );
                })}
              </div>

              {(selections[category.categoryId] || []).length > 0 && (
                <div className="selected-summary">
                  ✓ {(selections[category.categoryId] || []).length} producto(s) de {category.categoryName} seleccionado(s)
                </div>
              )}
            </div>
          ))}

          {/* Guarniciones Summary per Segundo */}
          {getSelectedSegundos().length > 0 && (
            <div className="category-selection">
              <div className="category-selection-header">
                <div>
                  <h3 className="category-selection-title">Guarniciones por Segundo</h3>
                </div>
              </div>
              {getSelectedSegundos().map(segundo => {
                const guarnicionIds = segundoGuarniciones[segundo.id] || [];
                return (
                  <div key={segundo.id} className="segundo-guarniciones-summary">
                    <div className="segundo-name">
                      <strong>{segundo.name}</strong>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setCurrentSegundoForGuarniciones(segundo);
                          setShowGuarnicionesModal(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {guarnicionIds.length > 0 ? (
                      <div className="selected-summary">
                        ✓ {guarnicionIds.length} guarnición(es): {
                          guarnicionesProducts
                            .filter(g => guarnicionIds.includes(g.id))
                            .map(g => g.name)
                            .join(', ')
                        }
                      </div>
                    ) : (
                      <div className="no-selection-warning">
                        ⚠ Sin guarniciones seleccionadas
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="menu-card-actions">
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {!allSegundosHaveGuarniciones()
                    ? 'Continuar a Guarniciones' 
                    : isEditing ? 'Actualizar Menú' : 'Crear Menú'
                  }
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Guarniciones Modal - Per Segundo */}
        {showGuarnicionesModal && currentSegundoForGuarniciones && (
          <div className="guarniciones-modal-overlay" onClick={() => setShowGuarnicionesModal(false)}>
            <div className="guarniciones-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="guarniciones-modal-header">
                <div>
                  <h3 className="guarniciones-modal-title">Seleccionar Guarniciones</h3>
                  <p className="guarniciones-modal-subtitle">
                    Elija las guarniciones para: <strong>{currentSegundoForGuarniciones.name}</strong>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowGuarnicionesModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="guarniciones-grid">
                {guarnicionesProducts.map((product) => {
                  const currentGuarniciones = segundoGuarniciones[currentSegundoForGuarniciones.id] || [];
                  const isSelected = currentGuarniciones.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`product-checkbox ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleGuarnicionSelection(currentSegundoForGuarniciones.id, product.id)}
                    >
                      <div className="product-checkbox-indicator">
                        {isSelected && <Check />}
                      </div>
                      <span className="product-checkbox-label">{product.name}</span>
                    </div>
                  );
                })}
              </div>

              {(segundoGuarniciones[currentSegundoForGuarniciones.id] || []).length > 0 && (
                <div className="selected-summary">
                  ✓ {(segundoGuarniciones[currentSegundoForGuarniciones.id] || []).length} guarnición(es) seleccionada(s)
                </div>
              )}

              <div className="guarniciones-modal-actions">
                <Button variant="outline" onClick={() => setShowGuarnicionesModal(false)}>
                  Volver
                </Button>
                <Button 
                  onClick={() => {
                    setShowGuarnicionesModal(false);
                    // After selecting guarniciones, try to submit again (will check for more segundos)
                    handleSubmit();
                  }} 
                  disabled={(segundoGuarniciones[currentSegundoForGuarniciones.id] || []).length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render menu list
  return (
    <div className="menu-diario-container">
      <div className="menu-diario-header">
        <div>
          <h1 className="menu-diario-title">Menú Diario</h1>
          <p className="menu-diario-subtitle">
            Administra los menús disponibles por día
          </p>
        </div>
        <div className="menu-diario-header-actions">
          <Button 
            variant="outline" 
            onClick={handleApplyTodaysMenu}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aplicar Menú de Hoy
              </>
            )}
          </Button>
          <Button onClick={handleStartCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Menú
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="menu-filters">
        <div className="menu-filters-left">
          <div className="filter-group">
            <label className="filter-label">Estado</label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Habilitados</SelectItem>
                <SelectItem value="disabled">Deshabilitados</SelectItem>
                <SelectItem value="past">Pasados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Orden</label>
            <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v as 'asc' | 'desc'); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Más reciente</SelectItem>
                <SelectItem value="asc">Más antiguo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Por página</label>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="menu-filters-right">
          <span className="total-items">{totalItems} menú(s) encontrado(s)</span>
        </div>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state">
          <Calendar className="empty-state-icon" />
          <h3 className="empty-state-title">No hay menús configurados</h3>
          <p className="empty-state-description">
            {statusFilter === 'enabled' 
              ? 'No hay menús habilitados. Crea uno nuevo o cambia el filtro.'
              : statusFilter === 'disabled'
              ? 'No hay menús deshabilitados.'
              : statusFilter === 'past'
              ? 'No hay menús pasados.'
              : 'No hay menús configurados. Crea uno nuevo.'}
          </p>
          <Button onClick={handleStartCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Menú
          </Button>
        </div>
      ) : (
        <div className="menu-list">
          {menus.map((menu) => {
            const past = isPastDate(menu.date);
            const today = isToday(menu.date);
            
            return (
              <Card key={menu._id} className="menu-card">
                <CardContent className="p-0">
                  <div className="menu-card-header">
                    <div>
                      <span className="menu-card-date">
                        {formatDate(menu.date)}
                        {today && <span className="today-badge">Hoy</span>}
                      </span>
                    </div>
                    <span className={`menu-card-status ${past ? 'past' : menu.isEnabled ? 'enabled' : 'disabled'}`}>
                      {past ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          Pasado
                        </>
                      ) : menu.isEnabled ? (
                        <>
                          <Check className="h-3 w-3" />
                          Habilitado
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" />
                          Deshabilitado
                        </>
                      )}
                    </span>
                  </div>

                  <div className="menu-card-content">
                    {menu.categorySelections.map((cs) => {
                      const isSegundo = cs.categoryName.toLowerCase() === 'segundo';
                      return (
                        <div key={cs.categoryId} className="menu-card-category">
                          <div className="menu-card-category-header">
                            <span className="category-badge">
                              {cs.categoryName}
                              <span className="category-badge-count">{cs.selectedProducts.length}</span>
                            </span>
                          </div>
                          <div className="menu-card-products">
                            {cs.selectedProducts.map((product, idx) => {
                              const productId = getProductId(product);
                              const productName = getProductName(product);
                              // For segundo, show guarniciones inline
                              const segundoGuarn = isSegundo 
                                ? (menu.segundoGuarniciones || []).find(sg => sg.segundoProductId === productId)
                                : null;
                              return (
                                <div key={productId} className="menu-card-product-item">
                                  <span className="menu-card-product-name">{productName}</span>
                                  {segundoGuarn && segundoGuarn.guarniciones.length > 0 && (
                                    <span className="menu-card-guarniciones">
                                      ({segundoGuarn.guarniciones.map((g, gIdx) => (
                                        <span key={getGuarnicionId(g)}>
                                          {getGuarnicionName(g)}{gIdx < segundoGuarn.guarniciones.length - 1 && ', '}
                                        </span>
                                      ))})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!past && (
                    <div className="menu-card-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleEnabled(menu._id)}
                      >
                        {menu.isEnabled ? 'Deshabilitar' : 'Habilitar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(menu)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setShowDeleteDialog(menu._id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar este menú diario? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

