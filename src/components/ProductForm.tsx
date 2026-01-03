import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useToast } from '../hooks/use-toast';

interface ProductFormProps {
  product?: any;
  categories: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, categories, onSuccess, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sellPrice: '',
    categoryId: '',
    isAvailable: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        sellPrice: product.sellPrice?.toString() || '',
        categoryId: product.categoryId?._id || product.categoryId || '',
        isAvailable: product.isAvailable ?? true,
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria.';
    }

    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      newErrors.sellPrice = 'El precio de venta debe ser mayor a 0.';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'La categoría es obligatoria.';
    }

    if (formData.price && parseFloat(formData.price) < 0) {
      newErrors.price = 'El precio base no puede ser negativo.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sellPrice: parseFloat(formData.sellPrice),
        categoryId: formData.categoryId,
        isAvailable: formData.isAvailable,
        ...(formData.price && { price: parseFloat(formData.price) }),
      };

      if (product) {
        await apiClient.updateProduct(product._id, productData);
      } else {
        await apiClient.createProduct(productData);
      }

      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Error al guardar el producto.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      
      // Handle validation errors from backend
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Producto *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ej: Pizza Margherita"
          disabled={loading}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) => handleChange('categoryId', value)}
          disabled={loading}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category._id} value={category._id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-sm text-red-600">{errors.categoryId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe el producto..."
          rows={3}
          disabled={loading}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Precio Base (Opcional)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            placeholder="0.00"
            disabled={loading}
          />
          {errors.price && (
            <p className="text-sm text-red-600">{errors.price}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Precio de costo para seguimiento interno
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellPrice">Precio de Venta *</Label>
          <Input
            id="sellPrice"
            type="number"
            step="0.01"
            value={formData.sellPrice}
            onChange={(e) => handleChange('sellPrice', e.target.value)}
            placeholder="0.00"
            disabled={loading}
          />
          {errors.sellPrice && (
            <p className="text-sm text-red-600">{errors.sellPrice}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Precio mostrado a los clientes
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isAvailable"
          checked={formData.isAvailable}
          onChange={(e) => handleChange('isAvailable', e.target.checked)}
          disabled={loading}
          className="rounded"
        />
        <Label htmlFor="isAvailable" className="cursor-pointer">
          El producto está disponible para pedidos
        </Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : product ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </div>
    </form>
  );
}

