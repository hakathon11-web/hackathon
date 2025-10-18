import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Edit, Trash2, Package, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVenueProducts, useCreateVenueProduct, useUpdateVenueProduct, useDeleteVenueProduct, type VenueProduct } from '@/hooks/useVenueProducts';
import { useToast } from '@/hooks/use-toast';

interface ProductsManagementProps {
  venueId: string;
  onProductsChange?: (products: VenueProduct[]) => void;
}

interface ProductFormData {
  name: string;
  price: string;
  stock_quantity: string;
  is_available: boolean;
}

const initialFormData: ProductFormData = {
  name: '',
  price: '',
  stock_quantity: '',
  is_available: true,
};

export function ProductsManagement({ venueId, onProductsChange }: ProductsManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const { data: products = [], isLoading } = useVenueProducts(venueId);
  const createProductMutation = useCreateVenueProduct();
  const updateProductMutation = useUpdateVenueProduct();
  const deleteProductMutation = useDeleteVenueProduct();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VenueProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  // Notify parent component when products change
  React.useEffect(() => {
    onProductsChange?.(products);
  }, [products, onProductsChange]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product: VenueProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock_quantity: product.stock_quantity?.toString() || '',
      is_available: product.is_available,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in product name and price.",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : undefined,
      is_available: formData.is_available,
    };

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          updates: productData,
        });
        toast({
          title: "Success",
          description: "Product updated successfully!",
        });
      } else {
        await createProductMutation.mutateAsync({
          venue_id: venueId,
          ...productData,
        });
        toast({
          title: "Success",
          description: "Product created successfully!",
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: editingProduct ? "Failed to update product." : "Failed to create product.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (product: VenueProduct) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteProductMutation.mutateAsync({
          id: product.id,
          venueId: venueId,
        });
        toast({
          title: "Success",
          description: "Product deleted successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete product.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('partner.addVenue.noProductsYet')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('partner.addVenue.addFirstProductDescription')}
            </p>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t('partner.addVenue.addFirstProduct')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        onClick={() => handleEdit(product)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(product)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Price:</span>
                      <span className="text-lg font-bold text-blue-600">
                        ₾{product.price.toFixed(2)}
                      </span>
                    </div>
                    {product.stock_quantity !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Stock:</span>
                        <span className="text-sm">{product.stock_quantity}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Status:</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        product.is_available 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Button */}
      {products.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t('partner.addVenue.addProduct')}
          </Button>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingProduct 
                    ? t('partner.addVenue.editProductTitle') 
                    : t('partner.addVenue.addNewProductTitle')}
                </CardTitle>
                <Button onClick={resetForm} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">{t('partner.addVenue.productName')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('partner.addVenue.productNamePlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">{t('partner.addVenue.productPrice')} *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder={t('partner.addVenue.productPricePlaceholder')}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock_quantity">{t('partner.addVenue.stockQuantity')}</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder={t('partner.addVenue.stockQuantityPlaceholder')}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_available"
                        checked={formData.is_available}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                      />
                      <Label htmlFor="is_available">{t('partner.addVenue.isAvailable')}</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createProductMutation.isPending || updateProductMutation.isPending 
                      ? 'Saving...' 
                      : editingProduct ? 'Update Product' : 'Create Product'
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
