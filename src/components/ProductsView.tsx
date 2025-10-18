import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVenueProducts, type VenueProduct } from '@/hooks/useVenueProducts';

interface ProductsViewProps {
  venueId: string;
}

export function ProductsView({ venueId }: ProductsViewProps) {
  const { t } = useTranslation();
  const { data: products = [], isLoading, error } = useVenueProducts(venueId);

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
