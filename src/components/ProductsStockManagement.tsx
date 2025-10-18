import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Edit, Save, X, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVenueProducts, type VenueProduct } from '@/hooks/useVenueProducts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductsStockManagementProps {
  venueId: string;
}

export function ProductsStockManagement({ venueId }: ProductsStockManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: products = [], isLoading, error, refetch } = useVenueProducts(venueId);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [stockValues, setStockValues] = useState<Record<string, number | null>>({});
  const [availabilityValues, setAvailabilityValues] = useState<Record<string, boolean>>({});

  const handleEditStock = (product: VenueProduct) => {
    setEditingProduct(product.id);
    setStockValues({ ...stockValues, [product.id]: product.stock_quantity });
    setAvailabilityValues({ ...availabilityValues, [product.id]: product.is_available });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setStockValues({});
    setAvailabilityValues({});
  };

  const handleSaveStock = async (product: VenueProduct) => {
    try {
      const newStockValue = stockValues[product.id];
      const newAvailability = availabilityValues[product.id];

      // Update the product with new stock and availability
      const { error: updateError } = await supabase
        .from('venue_products')
        .update({
          stock_quantity: newStockValue,
          is_available: newAvailability,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the products data
      await refetch();

      setEditingProduct(null);
      setStockValues({});
      setAvailabilityValues({});

      toast({
        title: "Stock Updated",
        description: `${product.name} stock has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating product stock:', error);
      toast({
        title: "Error",
        description: "Failed to update product stock. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStockChange = (productId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    if (numValue === null || numValue >= 0) {
      setStockValues({ ...stockValues, [productId]: numValue });
    }
  };

  const handleAvailabilityChange = (productId: string, checked: boolean) => {
    setAvailabilityValues({ ...availabilityValues, [productId]: checked });
  };

  const incrementStock = (productId: string) => {
    const currentValue = stockValues[productId] ?? 0;
    setStockValues({ ...stockValues, [productId]: currentValue + 1 });
  };

  const decrementStock = (productId: string) => {
    const currentValue = stockValues[productId] ?? 0;
    if (currentValue > 0) {
      setStockValues({ ...stockValues, [productId]: currentValue - 1 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">Error loading products: {error.message}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No products available
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No products have been added to this venue yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Stock Management
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Click the edit button on any product to manage its stock quantity and availability. 
          Stock is automatically updated when products are added or removed from events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </div>
                <div className="flex space-x-2">
                  {editingProduct === product.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSaveStock(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditStock(product)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Price:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₾{product.price.toFixed(2)}
                  </span>
                </div>

                {editingProduct === product.id ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`stock-${product.id}`} className="text-sm font-medium">
                        Stock Quantity
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decrementStock(product.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id={`stock-${product.id}`}
                          type="number"
                          min="0"
                          value={stockValues[product.id] ?? ''}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          className="text-center w-20"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => incrementStock(product.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Leave empty for unlimited stock
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`available-${product.id}`} className="text-sm font-medium">
                        Available
                      </Label>
                      <Switch
                        id={`available-${product.id}`}
                        checked={availabilityValues[product.id] ?? product.is_available}
                        onCheckedChange={(checked) => handleAvailabilityChange(product.id, checked)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Stock:</span>
                      <span className="text-sm">
                        {product.stock_quantity !== null ? product.stock_quantity : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge 
                        variant={product.is_available ? "default" : "secondary"}
                        className={
                          product.is_available 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }
                      >
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
