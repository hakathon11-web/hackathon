import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, MapPin, Search, Building, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import GoogleMapsWrapper from "./GoogleMapsWrapper";
import { categories } from "@/data/mockData";
import { sanitizeSearchQuery, sanitizeBusinessName, buildSafeVenueSearchQuery, buildSafeBusinessNameQuery } from "@/utils/inputSanitization";

interface SearchSuggestion {
  id: string;
  name: string;
  location: string;
  type: 'venue' | 'location';
}

interface SearchFilters {
  businessName: string;
}

interface VenueData {
  id: string;
  name: string;
  location: string;
}

const EnhancedSearchFilters = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({
    businessName: "",
  });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionField, setActiveSuggestionField] = useState<'businessName' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestionField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Sanitize search query to prevent SQL injection
      const sanitizedQuery = sanitizeSearchQuery(query);
      
      const searchQuery = buildSafeVenueSearchQuery(
        supabase
          .from('venues')
          .select('id, name, location'),
        sanitizedQuery
      ).limit(5);

      const { data: venues, error } = await searchQuery;

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      const typedVenues: VenueData[] = (venues || []).filter((venue): venue is VenueData => {
        return venue && 
               typeof venue.id === 'string' && 
               typeof venue.name === 'string' && 
               typeof venue.location === 'string';
      });

      const venueSuggestions: SearchSuggestion[] = typedVenues.map(venue => ({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        type: 'venue' as const
      }));
      setSuggestions(venueSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setFilters(prev => ({ ...prev, businessName: value }));
    fetchSuggestions(value);
    setShowSuggestions(true);
    setActiveSuggestionField('businessName');
  };


  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, businessName: suggestion.name }));
    setShowSuggestions(false);
    setActiveSuggestionField(null);
  };

  const handleSearch = async () => {
    console.log('Search filters:', filters);
    
    // Check if business name exactly matches a venue name
    if (filters.businessName.trim()) {
      try {
        // Sanitize business name to prevent SQL injection
        const sanitizedBusinessName = sanitizeBusinessName(filters.businessName);
        
        const { data: venues, error } = await buildSafeBusinessNameQuery(
          supabase
            .from('venues')
            .select('id, name'),
          sanitizedBusinessName
        ).limit(1);

        if (!error && venues && venues.length > 0) {
          const exactMatch = venues.find(venue => 
            venue.name.toLowerCase() === filters.businessName.toLowerCase().trim()
          );
          
          if (exactMatch) {
            // Open venue page in new tab for exact match
            window.open(`/venue/${exactMatch.id}`, '_blank');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking for exact venue match:', error);
      }
    }
    
    // If no exact match, proceed with regular search
    const searchParams = new URLSearchParams();
    
    if (filters.businessName) {
      searchParams.append('businessName', filters.businessName);
    }
    
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleMapLocationSelect = (location: string) => {
    setFilters(prev => ({ ...prev, businessName: location }));
    setShowMap(false);
  };

  return (
    <>
      {/* Horizontal Search Bar for All Screen Sizes */}
      <div className="flex flex-row items-center gap-0 bg-card/80 dark:bg-[hsl(var(--dark-surface-2))]/90 backdrop-blur-sm rounded-full border border-border dark:border-[hsl(var(--border))] p-1 max-w-xl mx-auto glass-effect dark:shadow-black/20">
        {/* Map Icon */}
        <div className="px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/search')}
            className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 dark:hover:bg-primary/20"
          >
            <Map className="h-5 w-5" />
          </Button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border dark:bg-[hsl(var(--border))]" />

        {/* Business Name */}
        <div className="flex-1 relative" ref={searchRef}>
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-muted-foreground dark:text-[hsl(var(--text-secondary))] mb-0.5">{t('home.searchVenues')}</div>
            <Input
              placeholder={t('home.searchPlaceholder')}
              value={filters.businessName}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => filters.businessName && setShowSuggestions(true)}
              className="border-0 p-0 text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-[hsl(var(--text-secondary))] focus-visible:ring-0 bg-transparent"
            />
          </div>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card dark:bg-[hsl(var(--dark-surface-3))] border border-border dark:border-[hsl(var(--border))] rounded-xl shadow-lg dark:shadow-black/50 overflow-hidden">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 dark:hover:bg-[hsl(var(--dark-surface-2))]/50 flex items-center gap-3 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Building className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground dark:text-white">{suggestion.name}</div>
                    <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))]">{suggestion.location}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="px-2">
          <Button 
            onClick={handleSearch}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-8 h-8 p-0 shadow-lg"
            disabled={loading}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card dark:bg-[hsl(var(--dark-surface-2))] rounded-xl w-full max-w-4xl h-[80vh] border border-border dark:border-[hsl(var(--border))] overflow-hidden shadow-2xl dark:shadow-black/50">
            <div className="flex justify-between items-center p-4 border-b border-border dark:border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">{t('home.selectLocation')}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMap(false)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 h-96">
              <GoogleMapsWrapper
                venues={[]}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedSearchFilters;