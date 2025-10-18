import React from 'react';
import { SkeletonCard } from '@/components/ui/loading';

const AppLoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Main content skeleton */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Hero section skeleton */}
        <div className="text-center mb-12 space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mx-auto animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-80 mx-auto animate-pulse"></div>
        </div>

        {/* Categories skeleton */}
        <div className="mb-12">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="mb-8">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>

        {/* Venues grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLoadingFallback;