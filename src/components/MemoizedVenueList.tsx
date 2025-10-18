import React from 'react';
import { motion } from "framer-motion";
import VenueCard from "./VenueCard";
import type { Venue } from "@/hooks/useVenues";

interface MemoizedVenueListProps {
  venues: Venue[];
  searchMode?: boolean;
}

/**
 * Memoized venue list component to prevent unnecessary re-renders
 * when venue data hasn't actually changed
 */
const MemoizedVenueList = React.memo(({ venues, searchMode = false }: MemoizedVenueListProps) => {
  return (
    <div className="search-results-grid grid-cols-1 sm:grid-cols-2">
      {venues.map((venue, index) => (
        <motion.div
          key={venue.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: (index % 12) * 0.05 }}
          className="group w-full"
        >
          <VenueCard venue={venue} searchMode={searchMode} />
        </motion.div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Only re-render if venue count or IDs have changed
  if (prevProps.venues.length !== nextProps.venues.length) {
    return false;
  }
  
  if (prevProps.searchMode !== nextProps.searchMode) {
    return false;
  }
  
  // Check if venue IDs have changed (shallow comparison)
  for (let i = 0; i < prevProps.venues.length; i++) {
    if (prevProps.venues[i].id !== nextProps.venues[i].id) {
      return false;
    }
  }
  
  return true;
});

export default MemoizedVenueList;
