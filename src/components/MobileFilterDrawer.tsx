import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Tag, X } from "lucide-react";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { TBILISI_DISTRICTS, TBILISI_DISTRICT_EN } from "@/constants/districts";

interface FilterState {
  services: string[];
  location: string[];
}

interface MobileFilterDrawerProps {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters: FilterState;
  onClose: () => void;
  showButtons?: boolean;
}

const locations = TBILISI_DISTRICTS;

const MobileFilterDrawer = ({ onFiltersChange, initialFilters, onClose, showButtons = true }: MobileFilterDrawerProps) => {
  const { t, i18n } = useTranslation();
  const { data: serviceTypes } = useServiceTypes();
  const { translateService } = useServiceTranslation();
  
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Listen for language changes to trigger re-render
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const getLocationLabel = (loc: string) => {
    if (typeof loc !== 'string') return '';
    // Check if current language is English
    const isEnglish = currentLanguage === 'en';
    return isEnglish
      ? TBILISI_DISTRICT_EN[loc as keyof typeof TBILISI_DISTRICT_EN] || loc
      : loc;
  };

  const handleServiceToggle = (service: string) => {
    const newServices = filters.services.includes(service)
      ? filters.services.filter(s => s !== service)
      : [...filters.services, service];
    
    const newFilters = { ...filters, services: newServices };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.location.includes(location)
      ? filters.location.filter(l => l !== location)
      : [...filters.location, location];
    
    const newFilters = { ...filters, location: newLocations };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters = { services: [], location: [] };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onClose();
  };

  const applyFilters = () => {
    onFiltersChange(filters);
    onClose();
  };

  const activeFilterCount = filters.services.length + filters.location.length;

  return (
    <div className="space-y-8">
      {/* Services Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground flex-1">
            {t('filters.services', 'Services')}
          </h3>
          {filters.services.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
              {filters.services.length}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {serviceTypes?.map((service) => (
            <div key={service.id} className="group">
              <label
                htmlFor={`service-${service.id}`}
                className="flex items-start gap-4 p-4 bg-card border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 group-hover:shadow-sm"
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={filters.services.includes(service.name)}
                  onCheckedChange={() => handleServiceToggle(service.name)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-base font-medium text-gray-800 leading-relaxed flex-1">
                  {translateService({
                    name: service.name,
                    name_en: service.name_en,
                    name_ka: service.name_ka
                  })}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Locations Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground flex-1">
            {t('filters.locations', 'Locations')}
          </h3>
          {filters.location.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
              {filters.location.length}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {locations.map((location) => (
            <div key={location} className="group">
              <label
                htmlFor={`location-${location}`}
                className="flex items-start gap-4 p-4 bg-card border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 group-hover:shadow-sm"
              >
                <Checkbox
                  id={`location-${location}`}
                  checked={filters.location.includes(location)}
                  onCheckedChange={() => handleLocationToggle(location)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-base font-medium text-gray-800 leading-relaxed flex-1">
                  {getLocationLabel(location)}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-semibold text-foreground">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost" 
              size="sm"
              onClick={clearAllFilters}
              className="text-primary hover:text-primary/80 hover:bg-primary/10 h-9 px-3 rounded-lg font-medium"
            >
              <X className="w-4 h-4 mr-2" />
              Clear all
            </Button>
          </div>
          
          {(filters.services.length > 0 || filters.location.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {filters.services.map((service) => (
                <Badge key={service} variant="secondary" className="text-sm bg-background/80 border-0 text-muted-foreground hover:bg-background transition-colors">
                  {service}
                  <button
                    onClick={() => handleServiceToggle(service)}
                    className="ml-2 hover:bg-gray-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filters.location.map((location) => (
                <Badge key={location} variant="secondary" className="text-sm bg-background/80 border-0 text-muted-foreground hover:bg-background transition-colors">
                  {getLocationLabel(location)}
                  <button
                    onClick={() => handleLocationToggle(location)}
                    className="ml-2 hover:bg-gray-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons - Only show if showButtons is true */}
      {showButtons && (
        <div className="flex gap-4 pt-6">
          <Button 
            variant="outline" 
            onClick={clearAllFilters}
            className="flex-1 h-14 font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-gray-700 transition-all duration-200"
            disabled={activeFilterCount === 0}
          >
            {t('filters.clearAll', 'Clear All')}
          </Button>
          <Button 
            onClick={applyFilters}
            className="flex-1 h-14 bg-primary hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl rounded-xl transition-all duration-200 text-white"
          >
            {t('filters.apply', 'Apply Filters')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-3 bg-background/20 text-foreground border-0 font-bold">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobileFilterDrawer;

// Export action button component for external use
export const MobileFilterActions = ({ 
  onApply, 
  onClearAll, 
  activeFilterCount,
  t 
}: {
  onApply: () => void;
  onClearAll: () => void;
  activeFilterCount: number;
  t: (key: string, fallback: string) => string;
}) => (
  <div className="flex gap-4 p-6 pb-8 bg-background border-t border-border">
    <Button 
      variant="outline" 
      onClick={onClearAll}
      className="flex-1 h-14 font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-gray-700 transition-all duration-200"
      disabled={activeFilterCount === 0}
    >
      {t('filters.clearAll', 'Clear All')}
    </Button>
    <Button 
      onClick={onApply}
      className="flex-1 h-14 bg-primary hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl rounded-xl transition-all duration-200 text-white"
    >
      {t('filters.apply', 'Apply Filters')}
      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="ml-3 bg-white/20 text-white border-0 font-bold">
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  </div>
);