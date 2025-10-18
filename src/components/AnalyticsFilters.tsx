import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, Calendar as CalendarIcon, Clock, Users, DollarSign, Mail, Building, Layers, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { formatDateWithLocale } from '@/lib/dateUtils';

interface FilterOptions {
  dateRange: { startDate: Date | undefined; endDate: Date | undefined };
  status: string;
  venue: string;
  service: string;
  guestCount: { min: string; max: string };
  priceRange: { min: string; max: string };
  timeRange: { startTime: string; endTime: string };
  customerEmail: string;
}

interface AnalyticsFiltersProps {
  venues: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  onApplyFilters: (appliedFilters: FilterOptions) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  venues,
  services,
  filters,
  onFiltersChange,
  onClearFilters,
  onApplyFilters,
  isExpanded,
  onToggleExpanded,
  hasActiveFilters,
  activeFilterCount
}) => {
  const { t } = useTranslation();
  const { translateService } = useServiceTranslation();
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);
  
  // Quick date range options
  const dateRangeOptions = [
    { label: t('dashboardFilters.today'), value: 'today' },
    { label: t('dashboardFilters.yesterday'), value: 'yesterday' },
    { label: t('dashboardFilters.last7Days'), value: 'last7Days' },
    { label: t('dashboardFilters.last30Days'), value: 'last30Days' },
    { label: t('dashboardFilters.thisWeek'), value: 'thisWeek' },
    { label: t('dashboardFilters.thisMonth'), value: 'thisMonth' },
  ];

  // Load applied filters into temp filters when panel opens
  useEffect(() => {
    if (isExpanded) {
      setTempFilters({ ...filters });
    }
  }, [isExpanded, filters]);

  const updateTempFilter = (key: keyof FilterOptions, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateDateRange = (field: 'startDate' | 'endDate', value: Date | undefined) => {
    updateTempFilter('dateRange', {
      ...tempFilters.dateRange,
      [field]: value
    });
  };

  const updateGuestCount = (field: 'min' | 'max', value: string) => {
    updateTempFilter('guestCount', {
      ...tempFilters.guestCount,
      [field]: value
    });
  };

  const updatePriceRange = (field: 'min' | 'max', value: string) => {
    updateTempFilter('priceRange', {
      ...tempFilters.priceRange,
      [field]: value
    });
  };

  const updateTimeRange = (field: 'startTime' | 'endTime', value: string) => {
    updateTempFilter('timeRange', {
      ...tempFilters.timeRange,
      [field]: value
    });
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    onApplyFilters(tempFilters);
    onToggleExpanded();
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterOptions = {
      dateRange: { startDate: undefined, endDate: undefined },
      status: 'all',
      venue: 'all',
      service: 'all',
      guestCount: { min: '', max: '' },
      priceRange: { min: '', max: '' },
      timeRange: { startTime: '', endTime: '' },
      customerEmail: ''
    };
    setTempFilters(emptyFilters);
    onClearFilters();
  };
  
  // Apply a preset date range
  const applyDateRangePreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    switch (preset) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // Set to end of today
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of yesterday
        break;
      case 'last7Days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6); // 6 days ago + today = 7 days
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // Set to end of today
        break;
      case 'last30Days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29); // 29 days ago + today = 30 days
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // Set to end of today
        break;
      case 'thisWeek':
        startDate = new Date(today);
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        startDate.setDate(diff);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // Set to end of today
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999); // Set to end of last day of month
        break;
      default:
        return;
    }
    
    console.log('Setting date range preset:', preset, {
      startDate: startDate?.toLocaleDateString(),
      endDate: endDate?.toLocaleDateString()
    });
    
    // Update both dates at once to ensure they're set together
    updateTempFilter('dateRange', {
      startDate: startDate,
      endDate: endDate
    });
  };
  
  // Format date for input display
  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Check if a specific filter is active
  const isFilterActive = (filterName: keyof FilterOptions): boolean => {
    switch (filterName) {
      case 'dateRange':
        return !!(tempFilters.dateRange.startDate || tempFilters.dateRange.endDate);
      case 'status':
        return tempFilters.status !== 'all';
      case 'venue':
        return tempFilters.venue !== 'all';
      case 'service':
        return tempFilters.service !== 'all';
      case 'guestCount':
        return !!(tempFilters.guestCount.min || tempFilters.guestCount.max);
      case 'priceRange':
        return !!(tempFilters.priceRange.min || tempFilters.priceRange.max);
      case 'timeRange':
        return !!(tempFilters.timeRange.startTime || tempFilters.timeRange.endTime);
      case 'customerEmail':
        return !!tempFilters.customerEmail.trim();
      default:
        return false;
    }
  };

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          variant="outline"
          onClick={onToggleExpanded}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {isExpanded ? t('filters.hide') : t('filters.show')}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-primary text-primary-foreground ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {t('filters.clear')}
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {isExpanded && (
        <Card className="border-2 border-primary/10 shadow-lg">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              {t('dashboardFilters.analyticsFilters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Date Range Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{t('dashboardFilters.dateRange')}</h3>
              </div>
              
              {/* Quick Date Range Options */}
              <div className="flex flex-wrap gap-2 mb-3">
                {dateRangeOptions.map((option) => {
                  // Determine if this preset is active
                  let isActive = false;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  if (option.value === 'today' && 
                      tempFilters.dateRange.startDate && 
                      tempFilters.dateRange.startDate.getDate() === today.getDate() &&
                      tempFilters.dateRange.startDate.getMonth() === today.getMonth() &&
                      tempFilters.dateRange.startDate.getFullYear() === today.getFullYear()) {
                    isActive = true;
                  }
                  
                  // Similar logic can be added for other presets
                  
                  return (
                    <Button 
                      key={option.value}
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => applyDateRangePreset(option.value)}
                      className={isActive ? "border-primary bg-primary/10" : ""}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              
              {/* Custom Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    {t('dashboardFilters.startDate')}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          isFilterActive('dateRange') && tempFilters.dateRange.startDate ? 'border-primary' : ''
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.startDate ? (
                          formatDateWithLocale(tempFilters.dateRange.startDate, "MMMM d, yyyy")
                        ) : (
                          <span className="text-muted-foreground">{t('dashboardFilters.startDate')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.startDate}
                        onSelect={(date) => updateDateRange('startDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    {t('dashboardFilters.endDate')}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          isFilterActive('dateRange') && tempFilters.dateRange.endDate ? 'border-primary' : ''
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tempFilters.dateRange.endDate ? (
                          formatDateWithLocale(tempFilters.dateRange.endDate, "MMMM d, yyyy")
                        ) : (
                          <span className="text-muted-foreground">{t('dashboardFilters.endDate')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempFilters.dateRange.endDate}
                        onSelect={(date) => {
                          // Set to end of day (23:59:59)
                          if (date) {
                            const endOfDay = new Date(date);
                            endOfDay.setHours(23, 59, 59, 999);
                            updateDateRange('endDate', endOfDay);
                          } else {
                            updateDateRange('endDate', undefined);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            
            {/* Main Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Badge className="h-3 w-3 rounded-full" variant="outline" />
                  {t('dashboardFilters.status')}
                </label>
                <Select 
                  value={tempFilters.status} 
                  onValueChange={(value) => updateTempFilter('status', value)}
                >
                  <SelectTrigger className={`${isFilterActive('status') ? 'border-primary' : ''}`}>
                    <SelectValue placeholder={t('dashboardFilters.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboardFilters.allStatuses')}</SelectItem>
                                            <SelectItem value="confirmed">{t('status.confirmed', 'Confirmed')}</SelectItem>
                <SelectItem value="pending">{t('status.pending', 'Pending')}</SelectItem>
                <SelectItem value="completed">{t('status.completed', 'Completed')}</SelectItem>
                <SelectItem value="rejected">{t('status.rejected', 'Rejected')}</SelectItem>
                <SelectItem value="cancelled">{t('status.cancelled', 'Cancelled')}</SelectItem>
                <SelectItem value="expired">{t('status.expired', 'Expired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {t('dashboardFilters.venue')}
                </label>
                <Select 
                  value={tempFilters.venue} 
                  onValueChange={(value) => updateTempFilter('venue', value)}
                >
                  <SelectTrigger className={`${isFilterActive('venue') ? 'border-primary' : ''}`}>
                    <SelectValue placeholder={t('dashboardFilters.selectVenue')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboardFilters.allVenues')}</SelectItem>
                    {venues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {t('dashboardFilters.service')}
                </label>
                <Select 
                  value={tempFilters.service} 
                  onValueChange={(value) => updateTempFilter('service', value)}
                >
                  <SelectTrigger className={`${isFilterActive('service') ? 'border-primary' : ''}`}>
                    <SelectValue placeholder={t('dashboardFilters.selectService')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboardFilters.allServices')}</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guest Count */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('dashboardFilters.guestCount')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={t('dashboardFilters.min')}
                    value={tempFilters.guestCount.min}
                    onChange={(e) => updateGuestCount('min', e.target.value)}
                    className={`flex-1 ${isFilterActive('guestCount') ? 'border-primary' : ''}`}
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder={t('dashboardFilters.max')}
                    value={tempFilters.guestCount.max}
                    onChange={(e) => updateGuestCount('max', e.target.value)}
                    className={`flex-1 ${isFilterActive('guestCount') ? 'border-primary' : ''}`}
                    min="0"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('dashboardFilters.priceRange')} (GEL)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={t('dashboardFilters.min')}
                    value={tempFilters.priceRange.min}
                    onChange={(e) => updatePriceRange('min', e.target.value)}
                    className={`flex-1 ${isFilterActive('priceRange') ? 'border-primary' : ''}`}
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder={t('dashboardFilters.max')}
                    value={tempFilters.priceRange.max}
                    onChange={(e) => updatePriceRange('max', e.target.value)}
                    className={`flex-1 ${isFilterActive('priceRange') ? 'border-primary' : ''}`}
                    min="0"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('dashboardFilters.timeRange')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={tempFilters.timeRange.startTime}
                    onChange={(e) => updateTimeRange('startTime', e.target.value)}
                    className={`flex-1 ${isFilterActive('timeRange') ? 'border-primary' : ''}`}
                  />
                  <Input
                    type="time"
                    value={tempFilters.timeRange.endTime}
                    onChange={(e) => updateTimeRange('endTime', e.target.value)}
                    className={`flex-1 ${isFilterActive('timeRange') ? 'border-primary' : ''}`}
                  />
                </div>
              </div>

              {/* Customer Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {t('dashboardFilters.customerEmail')}
                </label>
                <Input
                  type="email"
                  placeholder={t('dashboardFilters.searchByEmail')}
                  value={tempFilters.customerEmail}
                  onChange={(e) => updateTempFilter('customerEmail', e.target.value)}
                  className={`${isFilterActive('customerEmail') ? 'border-primary' : ''}`}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {Object.keys(tempFilters).some(key => isFilterActive(key as keyof FilterOptions)) && (
              <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t('dashboardFilters.activeFilters')}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isFilterActive('dateRange') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.dateRange')}: {tempFilters.dateRange.startDate?.toLocaleDateString()} - {tempFilters.dateRange.endDate?.toLocaleDateString() || 'now'}
                    </Badge>
                  )}
                  {isFilterActive('status') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.status')}: {t(`status.${tempFilters.status}`)}
                    </Badge>
                  )}
                  {isFilterActive('venue') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.venue')}: {venues.find(v => v.id === tempFilters.venue)?.name || tempFilters.venue}
                    </Badge>
                  )}
                  {isFilterActive('service') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.service')}: {services.find(s => s.id === tempFilters.service)?.name || tempFilters.service}
                    </Badge>
                  )}
                  {isFilterActive('guestCount') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.guestCount')}: {tempFilters.guestCount.min || '0'} - {tempFilters.guestCount.max || '∞'}
                    </Badge>
                  )}
                  {isFilterActive('priceRange') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.priceRange')}: {tempFilters.priceRange.min || '0'} - {tempFilters.priceRange.max || '∞'} GEL
                    </Badge>
                  )}
                  {isFilterActive('timeRange') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.timeRange')}: {tempFilters.timeRange.startTime || '00:00'} - {tempFilters.timeRange.endTime || '23:59'}
                    </Badge>
                  )}
                  {isFilterActive('customerEmail') && (
                    <Badge variant="outline" className="bg-primary/10">
                      {t('dashboardFilters.customerEmail')}: {tempFilters.customerEmail}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button 
                onClick={applyFilters} 
                className="flex-1 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {t('filters.apply')}
              </Button>
              <Button 
                variant="outline" 
                onClick={clearAllFilters}
                size="lg"
              >
                {t('filters.clearAll')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsFilters;
