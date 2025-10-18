import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, MapPin, Tag, Search, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { TBILISI_DISTRICTS, TBILISI_DISTRICT_EN } from "@/constants/districts";

interface FilterState {
  services: string[];
  location: string[];
}

interface HomePageFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  className?: string;
  initialFilters?: FilterState;
  isInFixedHeader?: boolean;
  defaultExpanded?: boolean;
  hideToggleButton?: boolean;
}


const locations = TBILISI_DISTRICTS;

// Games are loaded from DB


const HomePageFilters = ({ onFiltersChange, className = "", initialFilters, isInFixedHeader = false, defaultExpanded = false, hideToggleButton = false }: HomePageFiltersProps) => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { translateService } = useServiceTranslation();

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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [tempFilters, setTempFilters] = useState<FilterState>({
    services: [],
    location: []
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    services: [],
    location: []
  });
  const filterRef = useRef<HTMLDivElement>(null);
const { data: servicesList } = useServiceTypes();
  const services = servicesList || [];
  

  // Load applied filters into temp filters when panel opens
  useEffect(() => {
    if (isExpanded) {
      setTempFilters({
        services: [...appliedFilters.services],
        location: [...appliedFilters.location]
      });
    }
  }, [isExpanded]);

  // Initialize applied filters from props (used to reflect URL-provided filters)
  useEffect(() => {
    if (initialFilters) {
      setAppliedFilters({
        services: initialFilters.services ?? [],
        location: initialFilters.location ?? []
      });
    }
  }, [initialFilters]);

  const handleTempFilterChange = (key: keyof FilterState, value: string | string[]) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleServiceToggle = (serviceName: string) => {
    const newServices = tempFilters.services.includes(serviceName)
      ? tempFilters.services.filter(s => s !== serviceName)
      : [...tempFilters.services, serviceName];
    handleTempFilterChange('services', newServices);
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = tempFilters.location.includes(location)
      ? tempFilters.location.filter(l => l !== location)
      : [...tempFilters.location, location];
    handleTempFilterChange('location', newLocations);
  };



  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    onFiltersChange?.(tempFilters);
    setIsExpanded(false);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      services: [],
      location: []
    };
    setTempFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    onFiltersChange?.(emptyFilters);
    setIsExpanded(false);
  };

  const clearIndividualFilter = (filterType: keyof FilterState) => {
    const newTempFilters = { ...tempFilters, [filterType]: [] };
    setTempFilters(newTempFilters);
  };

  const hasActiveTempFilters = Object.values(tempFilters).some(value => 
    Array.isArray(value) ? value.length > 0 : false
  );

  const hasAppliedFilters = Object.values(appliedFilters).some(value => 
    Array.isArray(value) ? value.length > 0 : false
  );

  const activeFilterCount = appliedFilters.services.length + appliedFilters.location.length;

  return (
    <div className={`relative ${className}`} ref={filterRef}>
      {/* Filter Controls */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1 lg:gap-3 w-full">
        {/* Filter Toggle Button */}
        {!hideToggleButton && (
          <div className="relative">
            <Button
              variant="outline"
              size="lg"
              className={`w-full lg:w-auto group border-2 transition-all duration-300 bg-background text-foreground shadow-md ${
                isExpanded 
                  ? 'border-primary bg-primary/5 shadow-lg' 
                  : 'border-primary/30 hover:border-primary hover:bg-primary/5'
              } lg:py-2.5 lg:px-4 py-0 px-0.5`}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className={`h-5 w-5 mr-2 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`} />
              <span className="font-medium">
                {isExpanded ? t('filters.hide') : t('filters.show')}
              </span>
            </Button>
            
            {/* Active Filter Count Badge */}
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shadow-sm z-20"
                >
                  {activeFilterCount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Clear Filters Button - Only show when filters are applied */}
        <AnimatePresence>
          {hasAppliedFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={clearAllFilters}
                className="w-full lg:w-auto border-2 border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5 transition-all duration-300 shadow-md lg:py-2.5 lg:px-4 py-0 px-0.5"
              >
                <X className="h-5 w-5 mr-2" />
                <span className="font-medium">{t('filters.clear')}</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${isInFixedHeader ? 'fixed' : 'absolute'} top-full left-0 mt-4 z-50 w-full min-w-[320px] max-w-3xl right-0 sm:min-w-[450px] lg:min-w-[550px] ${isInFixedHeader ? 'top-[120px]' : ''}`}
          >
            <Card className="border border-primary/20 dark:border-primary/30 shadow-lg dark:shadow-black/50 bg-background dark:bg-[hsl(var(--dark-surface-2))] backdrop-blur-sm rounded-lg overflow-hidden mx-2 sm:mx-0">
              <CardContent className="p-3 sm:p-4 lg:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-3">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg">
                      <Filter className="h-4 w-4 text-primary" />
                    </div>
                    {t('filters.title')}
                  </h3>
                  {hasActiveTempFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-muted-foreground dark:text-[hsl(var(--text-secondary))] hover:text-destructive transition-colors self-start sm:self-auto text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('filters.clearAll')}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Services Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <div className="p-1 bg-primary/10 rounded">
                          <Tag className="h-3 w-3 text-primary" />
                        </div>
                        {t('filters.services')}
                      </label>
                      {tempFilters.services.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearIndividualFilter('services')}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-9 border border-muted hover:border-primary/50 transition-colors justify-between text-left font-normal text-sm min-h-[2.5rem]"
                        >
                          <span className="text-left flex-1 min-w-0">
                            {tempFilters.services.length === 0 
                              ? t('filters.chooseServices') 
                              : `${tempFilters.services.length} ${t('filters.selected')}`
                            }
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <div className="max-h-60 overflow-y-auto">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer"
                              onClick={() => handleServiceToggle(service.name)}
                            >
                              <Checkbox 
                                checked={tempFilters.services.includes(service.name)}
                                onChange={() => {}} // Handled by onClick above
                              />
                              <span className="text-sm">
                                {translateService({
                                  name: service.name,
                                  name_en: service.name_en,
                                  name_ka: service.name_ka
                                })}
                              </span>
                              {tempFilters.services.includes(service.name) && (
                                <Check className="h-4 w-4 ml-auto text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <div className="p-1 bg-primary/10 rounded">
                          <MapPin className="h-3 w-3 text-primary" />
                        </div>
                        {t('filters.locations')}
                      </label>
                      {tempFilters.location.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearIndividualFilter('location')}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-9 border border-muted hover:border-primary/50 transition-colors justify-between text-left font-normal text-sm min-h-[2.5rem]"
                        >
                          <span className="text-left flex-1 min-w-0">
                            {tempFilters.location.length === 0 
                              ? t('filters.chooseLocations') 
                              : `${tempFilters.location.length} ${t('filters.selected')}`
                            }
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <div className="max-h-60 overflow-y-auto">
                          {locations.map((location) => (
                            <div
                              key={location}
                              className="flex items-center space-x-2 px-3 py-2 hover:bg-muted cursor-pointer"
                              onClick={() => handleLocationToggle(location)}
                            >
                              <Checkbox 
                                checked={tempFilters.location.includes(location)}
                                onChange={() => {}} // Handled by onClick above
                              />
                              <span className="text-sm">{getLocationLabel(location)}</span>
                              {tempFilters.location.includes(location) && (
                                <Check className="h-4 w-4 ml-auto text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>



                {/* Apply Filters Button */}
                <div className="mt-6 pt-4 border-t border-muted flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={applyFilters}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-center min-w-0"
                    size="lg"
                  >
                    {t('filters.apply')}
                  </Button>
                  {hasActiveTempFilters && (
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      size="lg"
                      className="flex-1 sm:flex-none min-w-0 whitespace-nowrap px-4 sm:px-6"
                    >
                      {t('filters.clearAll')}
                    </Button>
                  )}
                </div>

                {/* Active Filters Summary */}
                {hasAppliedFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-6 pt-4 border-t border-muted"
                      >
                        <p className="text-sm text-muted-foreground mb-2">{t('filters.appliedFilters')}</p>
                        <div className="flex flex-wrap gap-2">
                          {appliedFilters.services.map((serviceName) => {
                            const service = services.find(s => s.name === serviceName);
                            return (
                              <Badge key={serviceName} variant="secondary" className="bg-primary/10 text-primary">
                                {t('filters.service')}: {service ? translateService({
                                  name: service.name,
                                  name_en: service.name_en,
                                  name_ka: service.name_ka
                                }) : serviceName}
                              </Badge>
                            );
                          })}
                          {appliedFilters.location.map((location) => (
                            <Badge key={location} variant="secondary" className="bg-primary/10 text-primary">
                              {t('filters.location')}: {getLocationLabel(location)}
                            </Badge>
                          ))}

                        </div>
                      </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePageFilters;