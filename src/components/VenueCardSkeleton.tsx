import React from 'react';

interface VenueCardSkeletonProps {
  count?: number;
}

const VenueCardSkeleton: React.FC<VenueCardSkeletonProps> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="venue-card-skeleton">
          <div className="p-4 h-full flex flex-col">
            {/* Image skeleton */}
            <div className="w-full h-48 bg-gray-200 rounded-lg mb-3 animate-pulse"></div>
            
            {/* Title skeleton */}
            <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
            
            {/* Location skeleton */}
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
            
            {/* Price skeleton */}
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
            
            {/* Tags skeleton */}
            <div className="flex gap-2 mb-3">
              <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            </div>
            
            {/* Button skeleton */}
            <div className="mt-auto">
              <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default VenueCardSkeleton;
