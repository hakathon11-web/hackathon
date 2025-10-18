import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, Users, Search, Filter, X, Building, DollarSign, User, Download, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import PartnerLayout from '@/components/PartnerLayout';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import BookingDetailsDialog from '@/components/BookingDetailsDialog';
import { formatBookingTimeDisplay } from '@/utils/bookingDisplay';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import { getTableLabel, getGuestLabel } from '@/utils/pricingLabels';
import { isPerTableService } from '@/constants/services';

interface Booking {
  id: string;
  venue_name: string;
  venue_id: string;
  venue_location?: string;
  user_email: string;
  booking_date: string;
  total_price: number;
  status: string;
  created_at: string;
  status_updated_at?: string;
  special_requests?: string;
  payment_method?: string;
  employee_id?: string | null;
  booking_services: Array<{
    id: string;
    service_id: string;
    arrival_datetime: string;
    departure_datetime: string;
    guest_count: number;
    table_configurations: any[];
    price_per_hour: number;
    duration_hours: number;
    subtotal: number;
  discounted_subtotal?: number;
    venue_services: {
      services: {
        name: string;
        pricing_model?: string;
        table_label?: string;
        guest_label?: string;
        table_label_ka?: string;
        guest_label_ka?: string;
      };
    };
  }>;
}

interface Filters {
  search: string;
  status: string;
  venue: string;
  service: string;
  bookingSource: string; // 'all', 'website', 'employee'
  paymentMethod: string; // 'all', 'card', 'cash', 'none'
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  priceMin: string;
  priceMax: string;
  guestMin: string;
  guestMax: string;
}

const History = () => {
  const { data: profile } = useProfile();
  const { t, i18n } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    venue: 'all',
    service: 'all',
    bookingSource: 'all',
    paymentMethod: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    priceMin: '',
    priceMax: '',
    guestMin: '',
    guestMax: ''
  });

  // Helper function to get the most common table label from booking services
  const getBookingTableLabel = (booking: any) => {
    if (!booking?.booking_services || booking.booking_services.length === 0) {
      return t('pricing.table');
    }
    
    const currentLanguage = i18n.language as 'en' | 'ka';
    const firstService = booking.booking_services[0];
    if (firstService?.venue_services) {
      return getTableLabel(firstService.venue_services, t('pricing.table'), currentLanguage);
    }
    return t('pricing.table');
  };

  // Helper function to get the most common guest label from booking services
  const getBookingGuestLabel = (booking: any) => {
    if (!booking?.booking_services || booking.booking_services.length === 0) {
      return t('pricing.guest');
    }
    
    const currentLanguage = i18n.language as 'en' | 'ka';
    const firstService = booking.booking_services[0];
    if (firstService?.venue_services) {
      return getGuestLabel(firstService.venue_services, t('pricing.guest'), currentLanguage);
    }
    return t('pricing.guest');
  };

  // Helper function to determine if booking uses table-wise pricing
  const isBookingTableWise = (booking: any) => {
    if (!booking?.booking_services || booking.booking_services.length === 0) {
      return false;
    }
    
    // Check if any service uses table-wise pricing
    return booking.booking_services.some((service: any) => 
      service?.venue_services?.services?.pricing_model && 
      isPerTableService(service.venue_services.services.pricing_model)
    );
  };

  // Helper function to get booking services summary
  const getBookingServicesSummary = (booking: any) => {
    if (!booking?.booking_services || booking.booking_services.length === 0) {
      return { hasTableWise: false, hasGuestWise: false, tableWiseCount: 0, guestWiseCount: 0, serviceNames: [] };
    }

    let hasTableWise = false;
    let hasGuestWise = false;
    let tableWiseCount = 0;
    let guestWiseCount = 0;
    const serviceNames: string[] = [];

    booking.booking_services.forEach((service: any) => {
      const pricingModel = service?.venue_services?.services?.pricing_model;
      const serviceName = service?.venue_services?.services?.name || 'Unknown Service';
      
      if (!serviceNames.includes(serviceName)) {
        serviceNames.push(serviceName);
      }
      
      if (isPerTableService(pricingModel)) {
        hasTableWise = true;
        tableWiseCount += service.table_configurations?.length || 0;
      } else {
        hasGuestWise = true;
        guestWiseCount += service.guest_count || 0;
      }
    });

    return { hasTableWise, hasGuestWise, tableWiseCount, guestWiseCount, serviceNames };
  };

  useEffect(() => {
    if (profile?.id) {
      fetchBookings();
      fetchVenues();
      fetchServices();
    }
  }, [profile?.id]);

  useEffect(() => {
    applyFilters();
  }, [bookings, filters]);

  const fetchBookings = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          total_price,
          status,
          created_at,
          status_updated_at,
          user_email,
          special_requests,
          payment_method,
          employee_id,
          venues!inner(id, name, location, partner_id),
          booking_services(
            id,
            service_id,
            arrival_datetime,
            departure_datetime,
            guest_count,
            table_configurations,
            price_per_hour,
            duration_hours,
            subtotal,
            discounted_subtotal,
            venue_services(
              services (
                name,
                pricing_model,
                table_label,
                guest_label,
                table_label_ka,
                guest_label_ka
              )
            )
          )
        `)
        .eq('venues.partner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedBookings: Booking[] = data.map(booking => ({
        id: booking.id,
        venue_name: booking.venues.name,
        venue_id: booking.venues.id,
        venue_location: booking.venues.location,
        user_email: booking.user_email,
        booking_date: booking.booking_date,
        total_price: booking.total_price,
        status: booking.status,
        created_at: booking.created_at,
        status_updated_at: booking.status_updated_at,
        special_requests: booking.special_requests,
        payment_method: booking.payment_method,
        employee_id: booking.employee_id,
        booking_services: (booking.booking_services || []).map(service => ({
          id: service.id,
          service_id: service.service_id,
          arrival_datetime: service.arrival_datetime,
          departure_datetime: service.departure_datetime,
          guest_count: service.guest_count,
          table_configurations: Array.isArray(service.table_configurations)
            ? service.table_configurations as any[]
            : typeof service.table_configurations === 'string'
              ? JSON.parse(service.table_configurations) as any[]
            : [],
          price_per_hour: service.price_per_hour,
          duration_hours: service.duration_hours,
          subtotal: service.subtotal,
          discounted_subtotal: (service as any).discounted_subtotal,
          venue_services: service.venue_services
        }))
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    if (!profile?.id) return;

    try {
      const { data } = await supabase
        .from('venues')
        .select('id, name')
        .eq('partner_id', profile.id);

      if (data) {
        setVenues(data);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const fetchServices = async () => {
    if (!profile?.id) return;

    try {
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .order('name');

      if (data) {
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(booking =>
        (booking.venue_name?.toLowerCase() || '').includes(searchLower) ||
        (booking.user_email?.toLowerCase() || '').includes(searchLower) ||
        (booking.id?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => booking.status === filters.status);
    }

    // Venue filter
    if (filters.venue !== 'all') {
      filtered = filtered.filter(booking => booking.venue_id === filters.venue);
    }

    // Service filter
    if (filters.service !== 'all') {
      filtered = filtered.filter(booking => 
        booking.booking_services.some(service => service.venue_services?.services?.id === filters.service)
      );
    }

    // Booking source filter
    if (filters.bookingSource !== 'all') {
      if (filters.bookingSource === 'website') {
        // Website bookings have null employee_id
        filtered = filtered.filter(booking => booking.employee_id === null);
      } else if (filters.bookingSource === 'employee') {
        // Employee bookings have non-null employee_id
        filtered = filtered.filter(booking => booking.employee_id !== null);
      }
    }

    // Payment method filter
    if (filters.paymentMethod !== 'all') {
      if (filters.paymentMethod === 'none') {
        filtered = filtered.filter(booking => !booking.payment_method);
      } else {
        filtered = filtered.filter(booking => booking.payment_method === filters.paymentMethod);
      }
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        return bookingDate >= fromDate;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        return bookingDate <= toDate;
      });
    }

    // Price range filter
    if (filters.priceMin) {
      filtered = filtered.filter(booking => booking.total_price >= Number(filters.priceMin));
    }
    if (filters.priceMax) {
      filtered = filtered.filter(booking => booking.total_price <= Number(filters.priceMax));
    }

    // Guest count filter
    if (filters.guestMin) {
      filtered = filtered.filter(booking => {
        const totalGuests = getTotalGuests(booking);
        return totalGuests >= Number(filters.guestMin);
      });
    }
    if (filters.guestMax) {
      filtered = filtered.filter(booking => {
        const totalGuests = getTotalGuests(booking);
        return totalGuests <= Number(filters.guestMax);
      });
    }

    setFilteredBookings(filtered);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      venue: 'all',
      service: 'all',
      bookingSource: 'all',
      paymentMethod: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      priceMin: '',
      priceMax: '',
      guestMin: '',
      guestMax: ''
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.venue !== 'all') count++;
    if (filters.service !== 'all') count++;
    if (filters.bookingSource !== 'all') count++;
    if (filters.paymentMethod !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.guestMin || filters.guestMax) count++;
    return count;
  };

  const downloadCSV = () => {
    if (filteredBookings.length === 0) {
      return;
    }

    // Define CSV headers with more detailed information
    const headers = [
      'Booking ID',
      'Venue',
      'Venue Location',
      'Customer Email',
      'Booking Date',
      'Arrival Time',
      'Departure Time',
      'Duration (Hours)',
      'Total Guests',
      'Total Tables',
      'Services',
      'Service Details',
      'Price Per Hour',
      'Subtotal',
      'Discount',
      `Total Price (${t('booking.currency')})`,
      'Payment Method',
      'Status',
      'Status Updated At',
      'Special Requests',
      'Created At'
    ];

    // Convert bookings to CSV rows
    const csvRows = filteredBookings.map(booking => {
      const totalGuests = getTotalGuests(booking);
      const totalTables = getTotalTables(booking);
      
      // Extract service information
      let arrivalTime = 'N/A';
      let departureTime = 'N/A';
      let totalDuration = 0;
      let serviceNames: string[] = [];
      let serviceDetails: string[] = [];
      let pricePerHour = 0;
      let subtotal = 0;
      let discount = 0;

      if (booking.booking_services && booking.booking_services.length > 0) {
        // Get earliest arrival and latest departure
        const sortedByArrival = [...booking.booking_services].sort((a, b) => 
          new Date(a.arrival_datetime).getTime() - new Date(b.arrival_datetime).getTime()
        );
        const sortedByDeparture = [...booking.booking_services].sort((a, b) => 
          new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()
        );
        
        arrivalTime = new Date(sortedByArrival[0].arrival_datetime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        departureTime = new Date(sortedByDeparture[0].departure_datetime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Calculate totals and collect service information
        booking.booking_services.forEach(service => {
          totalDuration += service.duration_hours || 0;
          pricePerHour += service.price_per_hour || 0;
          subtotal += service.subtotal || 0;
          
          if (service.discounted_subtotal && service.discounted_subtotal < service.subtotal) {
            discount += (service.subtotal - service.discounted_subtotal);
          }

          const serviceName = service.venue_services?.services?.name || 'Unknown Service';
          serviceNames.push(serviceName);

          // Create detailed service info
          const serviceInfo = `${serviceName} (${service.duration_hours}h × ${service.guest_count} ${t('booking.guests')} × ${service.price_per_hour} ${t('booking.currency')}/h = ${service.subtotal} ${t('booking.currency')})`;
          serviceDetails.push(serviceInfo);
        });
      }

      // Get payment method label
      const paymentMethodLabel = booking.payment_method 
        ? (booking.payment_method === 'card' 
            ? t('employee.paymentMethodCard', 'Card')
            : t('employee.paymentMethodCash', 'Cash'))
        : 'N/A';

      return [
        booking.id,
        booking.venue_name,
        booking.venue_location || 'N/A',
        booking.user_email,
        formatDate(booking.booking_date),
        arrivalTime,
        departureTime,
        totalDuration.toFixed(1),
        totalGuests.toString(),
        totalTables.toString(),
        serviceNames.join('; '),
        serviceDetails.join(' | '),
        pricePerHour.toFixed(2),
        subtotal.toFixed(2),
        discount > 0 ? discount.toFixed(2) : '0.00',
        booking.total_price.toFixed(2),
        paymentMethodLabel,
        getStatusLabel(booking.status),
        booking.status_updated_at ? formatDate(booking.status_updated_at) : 'N/A',
        booking.special_requests || 'N/A',
        formatDate(booking.created_at)
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `booking-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedBooking(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return t('status.confirmed', 'Confirmed');
      case 'pending':
        return t('status.pending', 'Pending');
      case 'rejected':
        return t('status.rejected', 'Rejected');
      case 'cancelled':
        return t('status.cancelled', 'Cancelled');
      case 'completed':
        return t('status.completed', 'Completed');
      case 'expired':
        return t('status.expired', 'Expired');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  };

  const getTotalGuests = (booking: Booking) => {
    return booking.booking_services.reduce((total, service) => {
      return total + (service.guest_count || 0);
    }, 0);
  };

  const getTotalTables = (booking: Booking) => {
    return booking.booking_services.reduce((total, service) => {
      const tableConfigs = service.table_configurations || [];
      return total + tableConfigs.length;
    }, 0);
  };

  if (loading) {
    return (
      <PartnerLayout>
        <div className="p-6 space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('partner.history.title', 'Booking History')}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('partner.history.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
                maxLength={100}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {t('partner.history.filters')}
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={downloadCSV}
                disabled={filteredBookings.length === 0}
                className="flex items-center gap-2"
                title={filteredBookings.length === 0 ? t('partner.history.noDataToExport') : t('partner.history.exportCsv')}
              >
                <Download className="h-4 w-4" />
                {t('partner.history.exportCsv')}
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="border-2 border-primary/10 shadow-lg overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{t('partner.history.filters')}</h3>
                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs flex-shrink-0 ml-2"
                  >
                    {t('partner.history.clearAllFilters')}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6">
                {/* Date Range Filter */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {t('partner.history.dateRange')}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal min-w-0 h-9 text-sm",
                            "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
                            "transition-all duration-200 hover:shadow-md",
                            !filters.dateFrom && "text-muted-foreground",
                            filters.dateFrom && "border-blue-200 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 text-blue-900 dark:text-white"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {filters.dateFrom ? filters.dateFrom.toLocaleDateString() : t('partner.history.fromDate')}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => {
                            setFilters(prev => ({ ...prev, dateFrom: date }));
                            setFromDateOpen(false);
                          }}
                          initialFocus
                          className="p-3 pointer-events-auto calendar-enhanced bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-0 ring-1 ring-gray-100/50 dark:ring-gray-700/50 backdrop-blur-sm"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-lg font-semibold text-gray-900 dark:text-white",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-medium text-sm py-2 px-1 text-center",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:bg-gray-100 dark:focus:bg-gray-700 focus:rounded-lg focus:outline-none text-gray-900 dark:text-white",
                            day_selected: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 focus:bg-gradient-to-r focus:from-blue-600 focus:to-blue-700 shadow-lg transform scale-105 transition-all duration-200",
                            day_today: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold ring-2 ring-blue-200 dark:ring-blue-400",
                            day_outside: "text-gray-400 dark:text-gray-500 opacity-50",
                            day_disabled: "text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed",
                            day_range_middle: "aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700 aria-selected:text-gray-900 dark:aria-selected:text-white",
                            day_hidden: "invisible",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal min-w-0 h-9 text-sm",
                            "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
                            "transition-all duration-200 hover:shadow-md",
                            !filters.dateTo && "text-muted-foreground",
                            filters.dateTo && "border-blue-200 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 text-blue-900 dark:text-white"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {filters.dateTo ? filters.dateTo.toLocaleDateString() : t('partner.history.toDate')}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => {
                            setFilters(prev => ({ ...prev, dateTo: date }));
                            setToDateOpen(false);
                          }}
                          disabled={(date) => filters.dateFrom ? (date < filters.dateFrom) : false}
                          initialFocus
                          className="p-3 pointer-events-auto calendar-enhanced bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-0 ring-1 ring-gray-100/50 dark:ring-gray-700/50 backdrop-blur-sm"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-lg font-semibold text-gray-900 dark:text-white",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-medium text-sm py-2 px-1 text-center",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:bg-gray-100 dark:focus:bg-gray-700 focus:rounded-lg focus:outline-none text-gray-900 dark:text-white",
                            day_selected: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 focus:bg-gradient-to-r focus:from-blue-600 focus:to-blue-700 shadow-lg transform scale-105 transition-all duration-200",
                            day_today: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-white font-semibold ring-2 ring-blue-200 dark:ring-blue-400",
                            day_outside: "text-gray-400 dark:text-gray-500 opacity-50",
                            day_disabled: "text-gray-300 dark:text-gray-600 opacity-30 cursor-not-allowed",
                            day_range_middle: "aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700 aria-selected:text-gray-900 dark:aria-selected:text-white",
                            day_hidden: "invisible",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t('partner.history.status')}</span>
                  </label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="min-w-0 h-9 text-sm">
                      <SelectValue placeholder={t('partner.history.allStatuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('partner.history.allStatuses')}</SelectItem>
                      <SelectItem value="pending">{t('partner.history.pending')}</SelectItem>
                      <SelectItem value="confirmed">{t('partner.history.confirmed')}</SelectItem>
                      <SelectItem value="completed">{t('partner.history.completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('partner.history.cancelled')}</SelectItem>
                      <SelectItem value="rejected">{t('partner.history.rejected')}</SelectItem>
                      <SelectItem value="expired">{t('partner.history.expired')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t('partner.history.venue')}</span>
                  </label>
                  <Select 
                    value={filters.venue} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, venue: value }))}
                  >
                    <SelectTrigger className="min-w-0 h-9 text-sm">
                      <SelectValue placeholder={t('partner.history.allVenues')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('partner.history.allVenues')}</SelectItem>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t('partner.history.service')}</span>
                  </label>
                  <Select 
                    value={filters.service} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, service: value }))}
                  >
                    <SelectTrigger className="min-w-0 h-9 text-sm">
                      <SelectValue placeholder={t('partner.history.allServices')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('partner.history.allServices')}</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Booking Source Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t('partner.history.bookingSource')}</span>
                  </label>
                  <Select 
                    value={filters.bookingSource} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, bookingSource: value }))}
                  >
                    <SelectTrigger className="min-w-0 h-9 text-sm">
                      <SelectValue placeholder={t('partner.history.allSources')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('partner.history.allSources')}</SelectItem>
                      <SelectItem value="website">{t('partner.history.websiteBookings')}</SelectItem>
                      <SelectItem value="employee">{t('partner.history.employeeBookings')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{t('partner.history.paymentMethod')}</span>
                  </label>
                  <Select 
                    value={filters.paymentMethod} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger className="min-w-0 h-9 text-sm">
                      <SelectValue placeholder={t('partner.history.allPaymentMethods')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('partner.history.allPaymentMethods')}</SelectItem>
                      <SelectItem value="card">{t('partner.history.cardPayments')}</SelectItem>
                      <SelectItem value="cash">{t('partner.history.cashPayments')}</SelectItem>
                      <SelectItem value="none">{t('partner.history.noPaymentMethod')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                  <label className="text-sm font-medium">{t('partner.history.priceRangeGel')}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t('partner.history.min')}
                      value={filters.priceMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="flex-1 h-9 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t('partner.history.max')}
                      value={filters.priceMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Guest Count Filter */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                  <label className="text-sm font-medium">{t('partner.history.guestCount')}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={t('partner.history.min')}
                      value={filters.guestMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, guestMin: e.target.value }))}
                      className="flex-1 h-9 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder={t('partner.history.max')}
                      value={filters.guestMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, guestMax: e.target.value }))}
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-6">
          {filteredBookings.length > 0 ? (
            <div className="overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                <div className="col-span-3">{t('partner.history.venue', 'Venue')}</div>
                <div className="col-span-2">{t('partner.history.dateTime', 'Date & Time')}</div>
                <div className="col-span-2">{t('partner.history.capacity', 'Capacity')}</div>
                <div className="col-span-2">{t('partner.history.customer', 'Customer')}</div>
                <div className="col-span-2">{t('partner.history.amount', 'Amount')}</div>
                <div className="col-span-1 text-center">{t('partner.history.status', 'Status')}</div>
              </div>

              {/* Booking Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {(showAll ? filteredBookings : filteredBookings.slice(0, 10)).map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => handleBookingClick(booking)}
                    className="group cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:shadow-sm"
                  >
                    {/* Desktop Layout */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                      {/* Venue & Booking ID */}
                      <div className="col-span-3 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {booking.venue_name}
                            </h4>
                            {(() => {
                              const servicesSummary = getBookingServicesSummary(booking);
                              if (servicesSummary.serviceNames.length > 1) {
                                return (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                                    {servicesSummary.serviceNames.length} services
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                            {getBookingIdDisplay(booking.id)}
                          </p>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="col-span-2 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{formatDate(booking.booking_date)}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <Clock className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {booking.booking_services && booking.booking_services.length > 0 
                                ? formatBookingTimeDisplay(
                                    booking.booking_services[0].arrival_datetime,
                                    booking.booking_services[0].departure_datetime
                                  )
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Capacity */}
                      <div className="col-span-2 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const servicesSummary = getBookingServicesSummary(booking);
                            const totalTables = getTotalTables(booking);
                            const totalGuests = getTotalGuests(booking);
                            
                            if (servicesSummary.hasTableWise && servicesSummary.hasGuestWise) {
                              // Mixed pricing - show both
                              return (
                                <>
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span>
                                      {totalGuests} {totalGuests !== 1 ? t('booking.guests', { guest: getBookingGuestLabel(booking) }) : t('booking.guest', { guest: getBookingGuestLabel(booking) })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </div>
                                </>
                              );
                            } else if (servicesSummary.hasTableWise) {
                              // Table-wise only - show tables only
                              return (
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                  <Building className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                  <span>
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </span>
                                </div>
                              );
                            } else {
                              // Guest-wise only - show both guests and tables
                              return (
                                <>
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span>
                                      {totalGuests} {totalGuests !== 1 ? t('booking.guests', { guest: getBookingGuestLabel(booking) }) : t('booking.guest', { guest: getBookingGuestLabel(booking) })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </div>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="col-span-2 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <User className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{booking.user_email}</span>
                            {booking.employee_id && (
                              <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-medium">
                                Employee
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="col-span-2 flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center text-sm font-semibold text-gray-900 dark:text-white">
                            <DollarSign className="h-3.5 w-3.5 mr-1 text-gray-400 flex-shrink-0" />
                            <span>{booking.total_price.toFixed(2)} {t('booking.currency')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex justify-center">
                        <Badge className={`${getStatusColor(booking.status)} text-xs px-2 py-1 font-medium`}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {booking.venue_name}
                            </h4>
                            {(() => {
                              const servicesSummary = getBookingServicesSummary(booking);
                              if (servicesSummary.serviceNames.length > 1) {
                                return (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                                    {servicesSummary.serviceNames.length} services
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {getBookingIdDisplay(booking.id)}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(booking.status)} text-xs px-2 py-1 font-medium flex-shrink-0`}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{formatDate(booking.booking_date)}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {booking.booking_services && booking.booking_services.length > 0 
                                ? formatBookingTimeDisplay(
                                    booking.booking_services[0].arrival_datetime,
                                    booking.booking_services[0].departure_datetime
                                  )
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {(() => {
                            const servicesSummary = getBookingServicesSummary(booking);
                            const totalTables = getTotalTables(booking);
                            const totalGuests = getTotalGuests(booking);
                            
                            if (servicesSummary.hasTableWise && servicesSummary.hasGuestWise) {
                              // Mixed pricing - show both
                              return (
                                <>
                                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                                    <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span>
                                      {totalGuests} {totalGuests !== 1 ? t('booking.guests', { guest: getBookingGuestLabel(booking) }) : t('booking.guest', { guest: getBookingGuestLabel(booking) })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </div>
                                </>
                              );
                            } else if (servicesSummary.hasTableWise) {
                              // Table-wise only - show tables only
                              return (
                                <div className="flex items-center text-gray-600 dark:text-gray-300">
                                  <Building className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                  <span>
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </span>
                                </div>
                              );
                            } else {
                              // Guest-wise only - show both guests and tables
                              return (
                                <>
                                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                                    <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span>
                                      {totalGuests} {totalGuests !== 1 ? t('booking.guests', { guest: getBookingGuestLabel(booking) }) : t('booking.guest', { guest: getBookingGuestLabel(booking) })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {totalTables} {totalTables !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}
                                  </div>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <User className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm truncate">{booking.user_email}</span>
                          {booking.employee_id && (
                            <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-medium">
                              Employee
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm font-semibold text-gray-900 dark:text-white">
                          <DollarSign className="h-3.5 w-3.5 mr-1 text-gray-400 flex-shrink-0" />
                          <span>{booking.total_price.toFixed(2)} {t('booking.currency')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {filteredBookings.length > 10 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    {showAll
                      ? t('common.showLess')
                      : t('partner.analytics.showAllWithCount', {
                        count: filteredBookings.length - 10
                        })}
                  </button>
                </div>
              )}
            </div>
            ) : (
            <div className="text-center py-12 px-6">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {getActiveFiltersCount() > 0 ? t('partner.history.noBookingsMatchFilters') : t('partner.analytics.noBookings')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  {getActiveFiltersCount() > 0
                    ? t('partner.history.tryAdjustingFilters')
                    : t('partner.analytics.noBookingsDescription')
                  }
                </p>
                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="px-6 py-2 text-sm font-medium"
                  >
                    {t('partner.history.clearAllFilters')}
                  </Button>
                )}
              </div>
            </div>
            )}
        </div>
      </div>

      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        booking={selectedBooking ? {
          id: selectedBooking.id,
          booking_date: selectedBooking.booking_date,
          total_price: selectedBooking.total_price,
          user_email: selectedBooking.user_email,
          venue_name: selectedBooking.venue_name,
          venue_id: selectedBooking.venue_id,
          created_at: selectedBooking.created_at,
          status: selectedBooking.status,
          booking_services: selectedBooking.booking_services as any
        } : null}
        showActions={false}
      />
    </PartnerLayout>
  );
};

export default History;
