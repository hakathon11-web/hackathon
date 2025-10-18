import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, MapPin, Tag, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { TBILISI_DISTRICTS, TBILISI_DISTRICT_EN } from "@/constants/districts";

interface FilterState {
  services: string[];
  location: string[];
}

interface InlineFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  className?: string;
  initialFilters?: FilterState;
}

const InlineFilters = ({ onFiltersChange, className = "", initialFilters }: InlineFiltersProps) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { data: servicesList } = useServiceTypes();
  const services = servicesList || [];
  const locations = TBILISI_DISTRICTS;

  const [filters, setFilters] = useState<FilterState>({
    services: initialFilters?.services || [],
    location: initialFilters?.location || []
  });

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Update filters when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      setFilters({
        services: initialFilters.services ?? [],
        location: initialFilters.location ?? []
      });
    }
  }, [initialFilters]);

  const getLocationLabel = (loc: string) => {
    if (typeof loc !== 'string') return '';
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
    onFiltersChange?.(newFilters);
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.location.includes(location)
      ? filters.location.filter(l => l !== location)
      : [...filters.location, location];
    const newFilters = { ...filters, location: newLocations };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const removeFilter = (type: 'services' | 'location', value: string) => {
    const newFilters = {
      ...filters,
      [type]: filters[type].filter(item => item !== value)
    };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      services: [],
      location: []
    };
    setFilters(emptyFilters);
    onFiltersChange?.(emptyFilters);
  };

  const hasActiveFilters = filters.services.length > 0 || filters.location.length > 0;
  const totalFilterCount = filters.services.length + filters.location.length;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Filter Dropdowns Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Services Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-9 px-3 gap-2 border-2 transition-all ${
                filters.services.length > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <Tag className="h-4 w-4" />
              <span className="text-sm font-medium">
                {filters.services.length === 0 
                  ? t('filters.services')
                  : `${t('filters.services')} (${filters.services.length})`
                }
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <div className="p-2 border-b bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('filters.chooseServices')}
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center space-x-3 px-3 py-2.5 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleServiceToggle(service.name)}
                >
                  <Checkbox 
                    checked={filters.services.includes(service.name)}
                    onChange={() => {}}
                    className="pointer-events-none"
                  />
                  <span className="text-sm flex-1">
                    {translateService({
                      name: service.name,
                      name_en: service.name_en,
                      name_ka: service.name_ka
                    })}
                  </span>
                  {filters.services.includes(service.name) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Location Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-9 px-3 gap-2 border-2 transition-all ${
                filters.location.length > 0
                  ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                {filters.location.length === 0 
                  ? t('filters.locations')
                  : `${t('filters.locations')} (${filters.location.length})`
                }
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <div className="p-2 border-b bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('filters.chooseLocations')}
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {locations.map((location) => (
                <div
                  key={location}
                  className="flex items-center space-x-3 px-3 py-2.5 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleLocationToggle(location)}
                >
                  <Checkbox 
                    checked={filters.location.includes(location)}
                    onChange={() => {}}
                    className="pointer-events-none"
                  />
                  <span className="text-sm flex-1">{getLocationLabel(location)}</span>
                  {filters.location.includes(location) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button - Only show when filters are active */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-1.5" />
                <span className="text-sm">{t('filters.clearAll')}</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Filter Badges Row */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-2"
          >
            {filters.services.map((serviceName) => {
              const service = services.find(s => s.name === serviceName);
              return (
                <motion.div
                  key={`service-${serviceName}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge
                    variant="secondary"
                    className="pl-2 pr-1 py-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5"
                  >
                    <Tag className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {service ? translateService({
                        name: service.name,
                        name_en: service.name_en,
                        name_ka: service.name_ka
                      }) : serviceName}
                    </span>
                  <button
                    onClick={() => removeFilter('services', serviceName)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/30 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </motion.div>
              );
            })}
            {filters.location.map((location) => (
              <motion.div
                key={`location-${location}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Badge
                  variant="secondary"
                  className="pl-2 pr-1 py-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5"
                >
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs font-medium">{getLocationLabel(location)}</span>
                  <button
                    onClick={() => removeFilter('location', location)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/30 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineFilters;

