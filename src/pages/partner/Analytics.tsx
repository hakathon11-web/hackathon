import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TrendingUp, DollarSign, Users, Clock, BarChart3, LineChart, Building, Layers, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import PartnerLayout from '@/components/PartnerLayout';
import { useTranslation } from 'react-i18next';
import { formatDateWithLocale } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BookingStats {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  rejected_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  expired_bookings: number;
  total_revenue: number;
  upcoming_bookings: number;
}

interface FilterOptions {
  venue: string;
  service: string;
  bookingSource: string; // 'all', 'website', 'employee'
  paymentMethod: string; // 'all', 'card', 'cash'
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface RecentBooking {
  id: string;
  venue_id: string;
  venue_name: string;
  user_email: string;
  booking_date: string;
  total_price: number;
  status: string;
  created_at: string;
  employee_id: string | null;
  payment_method: string | null;
            booking_services: Array<{
            arrival_datetime: string;
            departure_datetime: string;
            guest_count: number;
            table_configurations: any[];
            service_id: string;
            venue_services: {
              service_id: string;
              services: {
                id: string;
                name: string;
              };
            };
          }>;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

type Timeframe = 'day' | 'week' | 'month';

const Analytics = () => {
  const { data: profile } = useProfile();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<BookingStats>({
    total_bookings: 0,
    confirmed_bookings: 0,
    pending_bookings: 0,
    rejected_bookings: 0,
    cancelled_bookings: 0,
    completed_bookings: 0,
    expired_bookings: 0,
    total_revenue: 0,
    upcoming_bookings: 0
  });
  const [filteredStats, setFilteredStats] = useState<BookingStats>({
    total_bookings: 0,
    confirmed_bookings: 0,
    pending_bookings: 0,
    rejected_bookings: 0,
    cancelled_bookings: 0,
    completed_bookings: 0,
    expired_bookings: 0,
    total_revenue: 0,
    upcoming_bookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<RecentBooking[]>([]);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    venue: 'all',
    service: 'all',
    bookingSource: 'all',
    paymentMethod: 'all',
    dateRange: (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 6);
      return {
        from: lastWeek,
        to: today
      };
    })()
  });
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  // Chart data states
  const [bookingTrendData, setBookingTrendData] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  const [revenueData, setRevenueData] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  const [popularHoursData, setPopularHoursData] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  const [durationDistributionData, setDurationDistributionData] = useState<ChartData>({
    labels: [],
    datasets: []
  });



  useEffect(() => {
    fetchAnalytics();
  }, [profile?.id]);

  useEffect(() => {
    fetchFilterOptions();
  }, [profile?.id]);

  const fetchAnalytics = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          total_price,
          status,
          created_at,
          user_email,
          employee_id,
          payment_method,
          venues!inner(id, name, partner_id),
          booking_services(
            arrival_datetime,
            departure_datetime,
            guest_count,
            table_configurations,
            service_id,
            venue_services!inner(
              service_id,
              services!inner(
                id,
                name
              )
            )
          )
        `)
        .eq('venues.partner_id', profile.id as any);

      if (bookingsError) throw bookingsError;

      // Process booking data
      const bookingStats = processBookingStats(bookings || []);
      setStats(bookingStats);

      // Format recent bookings
      const formattedBookings: RecentBooking[] = (bookings || []).map((booking: any) => ({
          id: booking.id,
        venue_id: booking.venues.id,
        venue_name: booking.venues.name,
        user_email: booking.user_email,
          booking_date: booking.booking_date,
        total_price: booking.total_price,
          status: booking.status,
        created_at: booking.created_at,
        employee_id: booking.employee_id,
        payment_method: booking.payment_method || 'Not selected',
          booking_services: (booking.booking_services || []).map(service => ({
          arrival_datetime: service.arrival_datetime,
          departure_datetime: service.departure_datetime,
          guest_count: service.guest_count,
          service_id: service.service_id,
          table_configurations: Array.isArray(service.table_configurations) 
            ? service.table_configurations 
            : typeof service.table_configurations === 'string'
              ? JSON.parse(service.table_configurations) 
            : [],
          venue_services: service.venue_services
          }))
        }));

      setRecentBookings(formattedBookings);

      setFilteredBookings(formattedBookings);
      setFilteredStats(bookingStats);
      generateChartData(formattedBookings, filters.dateRange);

      // Fetch venues and services for filters
      await fetchFilterOptions();

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processBookingStats = (bookings: any[]): BookingStats => {
    const stats = {
      total_bookings: bookings.length,
        confirmed_bookings: 0,
        pending_bookings: 0,
        rejected_bookings: 0,
        cancelled_bookings: 0,
        completed_bookings: 0,
        expired_bookings: 0,
        total_revenue: 0,
        upcoming_bookings: 0
    };

    bookings.forEach(booking => {
        switch (booking.status) {
          case 'confirmed':
          stats.confirmed_bookings++;
          stats.total_revenue += Number(booking.total_price);
            break;
          case 'pending':
          stats.pending_bookings++;
            break;
          case 'rejected':
          stats.rejected_bookings++;
            break;
          case 'cancelled':
          stats.cancelled_bookings++;
            break;
          case 'completed':
          stats.completed_bookings++;
            break;
          case 'expired':
          stats.expired_bookings++;
            break;
        }

      // Check if booking is upcoming
      const bookingDate = new Date(booking.booking_date);
        const today = new Date();
      if (bookingDate >= today && booking.status === 'confirmed') {
        stats.upcoming_bookings++;
      }
    });

    return stats;
  };

  const generateChartData = (bookings: RecentBooking[], dateRange?: { from: Date | undefined; to: Date | undefined }) => {
    console.log('Generating chart data for all charts with bookings:', bookings.length);
    
    // Generate chart data for all bookings
    generateBookingTrendData(bookings, dateRange);
    generateRevenueData(bookings, dateRange);
    generatePopularHoursData(bookings);
    generateDurationDistributionData(bookings);
  };

  // Helper function to get granularity info for display
  const getGranularityInfo = () => {
    const now = new Date();
    const startDate = filters.dateRange.from || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endDate = filters.dateRange.to || now;
    
    const timeSpanDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (timeSpanDays <= 31) return t('partner.analytics.daily');
    if (timeSpanDays <= 90) return t('partner.analytics.weekly');
    if (timeSpanDays <= 365 * 2) return t('partner.analytics.monthly');
    return t('partner.analytics.yearly');
  };

  const generateBookingTrendData = (bookings: RecentBooking[], dateRange?: { from: Date | undefined; to: Date | undefined }) => {
    const labels: string[] = [];
    const data: number[] = [];
    
    // Determine the date range to analyze
    const now = new Date();
    const startDate = dateRange?.from || filters.dateRange.from || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endDate = dateRange?.to || filters.dateRange.to || now;
    
    // Calculate the time span in days
    const timeSpanDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine the appropriate granularity based on time span
    let granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
    let dateFormat: Intl.DateTimeFormatOptions;
    
    if (timeSpanDays <= 31) {
      // Up to 1 month: daily view
      granularity = 'daily';
      dateFormat = { month: 'short', day: 'numeric' };
    } else if (timeSpanDays <= 90) {
      // Up to 3 months: weekly view
      granularity = 'weekly';
      dateFormat = { month: 'short', day: 'numeric' };
    } else if (timeSpanDays <= 365 * 2) {
      // Up to 2 years: monthly view
      granularity = 'monthly';
      dateFormat = { month: 'short', year: 'numeric' };
    } else {
      // More than 2 years: yearly view
      granularity = 'yearly';
      dateFormat = { year: 'numeric' };
    }
    
    // Generate data points based on granularity
    const currentDate = new Date(startDate);
    const endDateForLoop = new Date(endDate);
    
    while (currentDate <= endDateForLoop) {
      let periodStart: Date;
      let periodEnd: Date;
      let label: string;
      
      switch (granularity) {
        case 'daily':
          periodStart = new Date(currentDate);
          periodEnd = new Date(currentDate);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
          
        case 'weekly':
          // Start of week (Monday)
          const dayOfWeek = currentDate.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          periodStart = new Date(currentDate);
          periodStart.setDate(currentDate.getDate() - daysToMonday);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          label = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          currentDate.setDate(currentDate.getDate() + 7);
          break;
          
        case 'monthly':
          periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
          
        case 'yearly':
          periodStart = new Date(currentDate.getFullYear(), 0, 1);
          periodEnd = new Date(currentDate.getFullYear(), 11, 31);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
      
      // Filter bookings for this period
      const periodBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= periodStart && bookingDate <= periodEnd;
      });
      
      labels.push(label);
      data.push(periodBookings.length);
    }
    
    setBookingTrendData({
      labels,
      datasets: [{
        label: `${t('partner.analytics.bookingsLabel')} (${granularity.charAt(0).toUpperCase() + granularity.slice(1)})`,
        data,
        borderColor: '#3b82f6',
        backgroundColor: ['rgba(59, 130, 246, 0.1)'],
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    });
  };

  const generateRevenueData = (bookings: RecentBooking[], dateRange?: { from: Date | undefined; to: Date | undefined }) => {
    const labels: string[] = [];
    const data: number[] = [];
    
    // Determine the date range to analyze
    const now = new Date();
    const startDate = dateRange?.from || filters.dateRange.from || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endDate = dateRange?.to || filters.dateRange.to || now;
    
    // Calculate the time span in days
    const timeSpanDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine the appropriate granularity based on time span
    let granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
    let dateFormat: Intl.DateTimeFormatOptions;
    
    if (timeSpanDays <= 31) {
      // Up to 1 month: daily view
      granularity = 'daily';
      dateFormat = { month: 'short', day: 'numeric' };
    } else if (timeSpanDays <= 90) {
      // Up to 3 months: weekly view
      granularity = 'weekly';
      dateFormat = { month: 'short', day: 'numeric' };
    } else if (timeSpanDays <= 365 * 2) {
      // Up to 2 years: monthly view
      granularity = 'monthly';
      dateFormat = { month: 'short', year: 'numeric' };
    } else {
      // More than 2 years: yearly view
      granularity = 'yearly';
      dateFormat = { year: 'numeric' };
    }
    
    // Generate data points based on granularity
    const currentDate = new Date(startDate);
    const endDateForLoop = new Date(endDate);
    
    while (currentDate <= endDateForLoop) {
      let periodStart: Date;
      let periodEnd: Date;
      let label: string;
      
      switch (granularity) {
        case 'daily':
          periodStart = new Date(currentDate);
          periodEnd = new Date(currentDate);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
          
        case 'weekly':
          // Start of week (Monday)
          const dayOfWeek = currentDate.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          periodStart = new Date(currentDate);
          periodStart.setDate(currentDate.getDate() - daysToMonday);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          label = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          currentDate.setDate(currentDate.getDate() + 7);
          break;
          
        case 'monthly':
          periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
          
        case 'yearly':
          periodStart = new Date(currentDate.getFullYear(), 0, 1);
          periodEnd = new Date(currentDate.getFullYear(), 11, 31);
          periodEnd.setHours(23, 59, 59, 999);
          label = currentDate.toLocaleDateString('en-US', dateFormat);
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
      
      // Filter bookings for this period
      const periodBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= periodStart && bookingDate <= periodEnd;
      });
      
      const periodRevenue = periodBookings.reduce((sum, booking) => sum + booking.total_price, 0);
      
      labels.push(label);
      data.push(periodRevenue);
    }
    
    setRevenueData({
      labels,
      datasets: [{
        label: `${t('partner.analytics.revenueLabel')} (${granularity.charAt(0).toUpperCase() + granularity.slice(1)})`,
        data,
        borderColor: '#10b981',
        backgroundColor: ['rgba(16, 185, 129, 0.1)'],
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    });
  };

  const generatePopularHoursData = (bookings: RecentBooking[]) => {
    console.log('Generating Popular Hours Data:', { bookings: bookings.length });

    const hours: { [key: string]: number } = {};
    
    // Initialize all hours with 0
    for (let i = 0; i < 24; i++) {
      const hourKey = `${i.toString().padStart(2, '0')}:00`;
      hours[hourKey] = 0;
    }

    bookings.forEach(booking => {
      console.log('Processing booking:', booking.id, 'with services:', booking.booking_services.length);
      
      // If no booking services, use booking date as fallback
      if (booking.booking_services.length === 0) {
        try {
          const bookingDate = new Date(booking.booking_date);
          if (!isNaN(bookingDate.getTime())) {
            const hour = bookingDate.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            hours[hourKey] = (hours[hourKey] || 0) + 1;
            console.log('Added booking for hour (from booking_date):', hourKey);
          }
        } catch (error) {
          console.error('Error processing booking date:', booking.booking_date, error);
        }
        return;
      }
      
      booking.booking_services.forEach(service => {
        console.log('Service arrival_datetime:', service.arrival_datetime);
        
        try {
          const arrivalTime = new Date(service.arrival_datetime);
          
          if (!isNaN(arrivalTime.getTime())) {
            const hour = arrivalTime.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            hours[hourKey] = (hours[hourKey] || 0) + 1;
            console.log('Added booking for hour:', hourKey);
          } else {
            console.log('Invalid arrival time, trying booking_date as fallback');
            // Fallback to booking date
            const bookingDate = new Date(booking.booking_date);
            if (!isNaN(bookingDate.getTime())) {
              const hour = bookingDate.getHours();
              const hourKey = `${hour.toString().padStart(2, '0')}:00`;
              hours[hourKey] = (hours[hourKey] || 0) + 1;
              console.log('Added booking for hour (fallback):', hourKey);
            }
          }
        } catch (error) {
          console.error('Error processing arrival time:', service.arrival_datetime, error);
          // Fallback to booking date
          try {
            const bookingDate = new Date(booking.booking_date);
            if (!isNaN(bookingDate.getTime())) {
              const hour = bookingDate.getHours();
              const hourKey = `${hour.toString().padStart(2, '0')}:00`;
              hours[hourKey] = (hours[hourKey] || 0) + 1;
              console.log('Added booking for hour (error fallback):', hourKey);
            }
          } catch (fallbackError) {
            console.error('Error processing booking date fallback:', booking.booking_date, fallbackError);
          }
        }
      });
    });

    const labels = Object.keys(hours).sort();
    const data = labels.map(hour => hours[hour]);

    console.log('Popular Hours final data:', { labels, data });

    setPopularHoursData({
      labels,
      datasets: [{
        label: t('partner.analytics.bookingsPerHour'),
        data,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: ['rgba(255, 99, 132, 0.2)'],
        fill: true,
        tension: 0.4
      }]
    });
  };

  const generateDurationDistributionData = (bookings: RecentBooking[]) => {
    console.log('Generating Duration Distribution Data:', { bookings: bookings.length });

    const durations: { [key: string]: number } = {};
    
    bookings.forEach(booking => {
      console.log('Processing booking for duration:', booking.id, 'with services:', booking.booking_services.length);
      
      booking.booking_services.forEach(service => {
        console.log('Service times:', { arrival: service.arrival_datetime, departure: service.departure_datetime });
        
        try {
          const arrivalTime = new Date(service.arrival_datetime);
          const departureTime = new Date(service.departure_datetime);
          
          if (!isNaN(arrivalTime.getTime()) && !isNaN(departureTime.getTime())) {
            // Use timezone-independent calculation to avoid issues with overnight bookings
            const arrivalHour = arrivalTime.getHours();
            const arrivalMinute = arrivalTime.getMinutes();
            const departureHour = departureTime.getHours();
            const departureMinute = departureTime.getMinutes();
            
            const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
            const departureMinutes = departureHour * 60 + departureMinute;
            
            let durationMinutes: number;
            if (departureMinutes >= arrivalMinutes) {
              // Same day booking
              durationMinutes = departureMinutes - arrivalMinutes;
            } else {
              // Overnight booking (departure is next day)
              durationMinutes = (24 * 60) - arrivalMinutes + departureMinutes;
            }
            
            // Handle negative or invalid durations
            if (durationMinutes > 0 && durationMinutes < 1440) { // Less than 24 hours
              const durationKey = `${durationMinutes} min`;
              durations[durationKey] = (durations[durationKey] || 0) + 1;
              console.log('Added duration:', durationKey);
            } else {
              console.log('Invalid duration:', durationMinutes, 'minutes');
            }
          } else {
            console.log('Invalid times:', { arrival: service.arrival_datetime, departure: service.departure_datetime });
          }
        } catch (error) {
          console.error('Error processing duration:', service.arrival_datetime, service.departure_datetime, error);
        }
      });
    });

    console.log('Duration data found:', durations);

    // If no valid durations found, create a default dataset
    if (Object.keys(durations).length === 0) {
      console.log('No valid durations found, showing default dataset');
      setDurationDistributionData({
        labels: [t('partner.analytics.noData')],
        datasets: [{
          label: t('partner.analytics.bookingsByDuration'),
          data: [0],
          backgroundColor: ['rgba(128, 128, 128, 0.5)'],
          borderWidth: 1
        }]
      });
      return;
    }

    const labels = Object.keys(durations).sort((a, b) => {
      const aMinutes = parseInt(a.split(' ')[0]);
      const bMinutes = parseInt(b.split(' ')[0]);
      return aMinutes - bMinutes;
    });
    const data = labels.map(duration => durations[duration]);

    console.log('Duration Distribution final data:', { labels, data });

    setDurationDistributionData({
      labels,
      datasets: [{
        label: 'Bookings by Duration',
        data,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: '#9333ea',
        borderWidth: 1
      }]
    });
  };



  const fetchFilterOptions = async () => {
    if (!profile?.id) return;

    try {
      // Fetch venues
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name')
        .eq('partner_id', profile.id as any);

      if (venuesData) {
        console.log('Fetched venues:', venuesData);
        setVenues(venuesData as Array<{ id: string; name: string }>);
      }

      // Fetch services that are actually used by partner's venues
      const { data: servicesData } = await supabase
        .from('venue_services')
        .select(`
          service_id,
          services!inner(
            id,
            name
          )
        `)
        .in('venue_id', venuesData?.map((v: any) => v.id) || []);

      if (servicesData) {
        // Extract unique services from the venue_services data
        const uniqueServices = (servicesData as any[]).reduce((acc, item) => {
          const service = item.services;
          if (service && !acc.find(s => s.id === service.id)) {
            acc.push({
              id: service.id,
              name: service.name
            });
          }
          return acc;
        }, [] as Array<{ id: string; name: string }>);

        console.log('Fetched services used by partner venues:', uniqueServices);
        setServices(uniqueServices);
      }
        } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const applyFiltersToBookings = (bookings: RecentBooking[], filters: FilterOptions): RecentBooking[] => {
    console.log('Applying filters to bookings:', { bookingsCount: bookings.length, filters });
    const filtered = bookings.filter(booking => {
      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const bookingDate = new Date(booking.booking_date);
        if (filters.dateRange.from && bookingDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && bookingDate > filters.dateRange.to) return false;
      }

      // Venue filter
      if (filters.venue !== 'all') {
        if (booking.venue_id !== filters.venue) return false;
      }

      // Service filter
      if (filters.service !== 'all') {
        const hasService = booking.booking_services.some(service => 
          service.venue_services?.services?.id === filters.service
        );
        if (!hasService) return false;
      }

      // Booking source filter
      if (filters.bookingSource !== 'all') {
        if (filters.bookingSource === 'website') {
          // Website bookings have null employee_id
          if (booking.employee_id !== null) return false;
        } else if (filters.bookingSource === 'employee') {
          // Employee bookings have non-null employee_id
          if (booking.employee_id === null) return false;
        }
      }

      // Payment method filter
      if (filters.paymentMethod !== 'all') {
        if (filters.paymentMethod === 'none') {
          if (booking.payment_method !== 'Not selected') return false;
        } else {
          if (booking.payment_method !== filters.paymentMethod) return false;
        }
      }

      return true;
    });
    console.log('Filtered bookings result:', { originalCount: bookings.length, filteredCount: filtered.length });
    return filtered;
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    
    if (recentBookings.length > 0) {
      const filteredBookings = applyFiltersToBookings(recentBookings, newFilters);
      setFilteredBookings(filteredBookings);
      const filteredStats = processBookingStats(filteredBookings);
      setFilteredStats(filteredStats);
      generateChartData(filteredBookings, newFilters.dateRange);
    }
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: Date | undefined) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    };
    handleFilterChange(newFilters);
    
    // Close the popover after date selection (following BookingForm pattern)
    if (value) {
      if (field === 'from') {
        setFromDateOpen(false);
      } else {
        setToDateOpen(false);
      }
    }
  };

  const clearAllFilters = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    
    const newFilters = {
      venue: 'all',
      service: 'all',
      bookingSource: 'all',
      paymentMethod: 'all',
      dateRange: {
        from: lastWeek,
        to: today
      }
    };
    handleFilterChange(newFilters);
    
    // Close any open date popovers
    setFromDateOpen(false);
    setToDateOpen(false);
  };

  const formatDateForDisplay = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isDefaultDateRange = () => {
    if (!filters.dateRange.from || !filters.dateRange.to) return false;
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    
    return filters.dateRange.from.getTime() === lastWeek.getTime() && 
           filters.dateRange.to.getTime() === today.getTime();
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    
    switch (preset) {
      case 'last7days':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 6);
        toDate = new Date(today);
        break;
      case 'last30days':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 29);
        toDate = new Date(today);
        break;
      case 'thisMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last3months':
        fromDate = new Date(today);
        fromDate.setMonth(fromDate.getMonth() - 3);
        toDate = new Date(today);
        break;
      case 'last6months':
        fromDate = new Date(today);
        fromDate.setMonth(fromDate.getMonth() - 6);
        toDate = new Date(today);
        break;
      case 'lastYear':
        fromDate = new Date(today);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        toDate = new Date(today);
        break;
      case 'last2Years':
        fromDate = new Date(today);
        fromDate.setFullYear(fromDate.getFullYear() - 2);
        toDate = new Date(today);
        break;
      default:
        return;
    }
    
    const newFilters = {
      ...filters,
      dateRange: { from: fromDate, to: toDate }
    };
    handleFilterChange(newFilters);
    
    // Close any open date popovers
    setFromDateOpen(false);
    setToDateOpen(false);
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        enabled: true,
        position: 'nearest' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          }
        }
      }
    },
    hover: {
      mode: 'index' as const,
      intersect: false
    }
  };



    return (
      <PartnerLayout>
        <div className="p-6 max-lg:p-4 space-y-6 max-lg:space-y-4 min-w-0">
        {/* Header */}
        <div className="flex flex-col max-lg:flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 max-lg:space-y-3 lg:space-y-0">
          <div>
            <h1 className="text-3xl max-lg:text-2xl font-bold text-gray-900 dark:text-white">
              {t('partner.analytics.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-lg:mt-1 max-lg:text-sm">
              {t('partner.analytics.subtitle')}
            </p>
          </div>
        </div>

        {/* Simple Filters */}
        <Card className="border-2 border-primary/10 shadow-lg overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{t('partner.analytics.filters')}</h3>
              {(filters.venue !== 'all' || filters.service !== 'all' || filters.bookingSource !== 'all' || filters.paymentMethod !== 'all' || !isDefaultDateRange()) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs flex-shrink-0 ml-2"
                >
                  {t('partner.analytics.clearAllFilters')}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6">
              {/* Date Range Filter */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {t('partner.analytics.dateRange')}
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
                          !filters.dateRange.from && "text-muted-foreground",
                          filters.dateRange.from && "border-blue-200 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 text-blue-900 dark:text-white"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {filters.dateRange.from ? formatDateForDisplay(filters.dateRange.from) : t('partner.analytics.fromDate')}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => handleDateRangeChange('from', date)}
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
                          !filters.dateRange.to && "text-muted-foreground",
                          filters.dateRange.to && "border-blue-200 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 text-blue-900 dark:text-white",
                          !filters.dateRange.from && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!filters.dateRange.from}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {filters.dateRange.to ? formatDateForDisplay(filters.dateRange.to) : t('partner.analytics.toDate')}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => handleDateRangeChange('to', date)}
                        disabled={(date) => !filters.dateRange.from || (date < filters.dateRange.from)}
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
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('last7days')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.sevenDays')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('last30days')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.thirtyDays')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('thisMonth')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.thisMonth')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('last3months')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.threeMonths')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('last6months')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.sixMonths')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyDatePreset('lastYear')}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('partner.analytics.oneYear')}
                  </Button>
                </div>
              </div>

              {/* Venue Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t('dashboardFilters.venue')}</span>
                </label>
                <Select 
                  value={filters.venue} 
                  onValueChange={(value) => handleFilterChange({ ...filters, venue: value })}
                >
                  <SelectTrigger className="min-w-0 h-9 text-sm">
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

              {/* Service Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t('dashboardFilters.service')}</span>
                </label>
                <Select 
                  value={filters.service} 
                  onValueChange={(value) => handleFilterChange({ ...filters, service: value })}
                >
                  <SelectTrigger className="min-w-0 h-9 text-sm">
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

              {/* Booking Source Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t('partner.analytics.bookingSource')}</span>
                </label>
                <Select 
                  value={filters.bookingSource} 
                  onValueChange={(value) => handleFilterChange({ ...filters, bookingSource: value })}
                >
                  <SelectTrigger className="min-w-0 h-9 text-sm">
                    <SelectValue placeholder={t('partner.analytics.selectBookingSource')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('partner.analytics.allSources')}</SelectItem>
                    <SelectItem value="website">{t('partner.analytics.websiteBookings')}</SelectItem>
                    <SelectItem value="employee">{t('partner.analytics.employeeBookings')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t('partner.analytics.paymentMethod')}</span>
                </label>
                <Select 
                  value={filters.paymentMethod} 
                  onValueChange={(value) => handleFilterChange({ ...filters, paymentMethod: value })}
                >
                  <SelectTrigger className="min-w-0 h-9 text-sm">
                    <SelectValue placeholder={t('partner.analytics.selectPaymentMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('partner.analytics.allPaymentMethods')}</SelectItem>
                    <SelectItem value="card">{t('partner.analytics.cardPayments')}</SelectItem>
                    <SelectItem value="cash">{t('partner.analytics.cashPayments')}</SelectItem>
                    <SelectItem value="none">Not selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
          
        {/* KPI Cards */}
          <div className="grid grid-cols-1 max-lg:grid-cols-1 md:grid-cols-2 gap-6 max-lg:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-blue-900 dark:text-blue-100">
                {t('partner.analytics.totalBookings')}
              </CardTitle>
              <Users className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {filteredStats.total_bookings}
                </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('partner.analytics.allTime')}
                </p>
              </CardContent>
            </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-green-900 dark:text-green-100">
                {t('partner.analytics.totalRevenue')}
              </CardTitle>
              <TrendingUp className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-green-900 dark:text-green-100">
                  {filteredStats.total_revenue.toFixed(2)} {t('booking.currency')}
                </div>
              <p className="text-sm max-lg:text-xs text-green-700 dark:text-green-300 mt-1">
                {t('partner.analytics.fromConfirmed')}
                </p>
              </CardContent>
            </Card>


          </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 max-lg:grid-cols-1 lg:grid-cols-2 gap-6 max-lg:gap-4 relative z-0">
          {/* Booking Trends Chart */}
          <Card className="relative z-0">
            <CardHeader className="p-6 max-lg:p-4">
                              <CardTitle className="flex items-center gap-2 text-xl max-lg:text-lg">
                  <LineChart className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-blue-600" />
                  {t('analytics.bookingTrends')}
                  <Badge variant="outline" className="text-xs">
                    {getGranularityInfo()}
                  </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="h-64 max-lg:h-48 relative z-0">
                <Line data={bookingTrendData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="relative z-0">
            <CardHeader className="p-6 max-lg:p-4">
                              <CardTitle className="flex items-center gap-2 text-xl max-lg:text-lg">
                  <TrendingUp className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-green-600" />
                  {t('analytics.revenueTrends')}
                  <Badge variant="outline" className="text-xs">
                    {getGranularityInfo()}
                  </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="h-64 max-lg:h-48 relative z-0">
                <Line data={revenueData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Charts Section - Popular Hours and Duration Distribution */}
        <div className="grid grid-cols-1 max-lg:grid-cols-1 lg:grid-cols-2 gap-6 max-lg:gap-4 relative z-0">
          {/* Popular Hours Chart */}
          <Card className="relative z-0">
            <CardHeader className="p-6 max-lg:p-4">
              <CardTitle className="flex items-center gap-2 text-xl max-lg:text-lg">
                <Clock className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-orange-600" />
                {t('analytics.popularHours')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="h-64 max-lg:h-48 relative z-0">
                <Line data={popularHoursData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Duration Distribution Chart */}
          <Card className="relative z-0">
            <CardHeader className="p-6 max-lg:p-4">
              <CardTitle className="flex items-center gap-2 text-xl max-lg:text-lg">
                <BarChart3 className="h-5 w-5 max-lg:h-4 max-lg:w-4 text-purple-600" />
                {t('analytics.durationDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="h-64 max-lg:h-48 relative z-0">
                <Bar data={durationDistributionData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
                  <div className="grid grid-cols-1 max-lg:grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-lg:gap-4">


          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <div className="w-4 h-4 max-lg:w-3 max-lg:h-3 bg-blue-500 rounded-full"></div>
                {t('status.confirmed', 'Confirmed')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-blue-900 dark:text-blue-100">
                {filteredStats.confirmed_bookings}
              </div>
              <p className="text-sm max-lg:text-xs text-blue-700 dark:text-blue-300 mt-1">
                {t('partner.analytics.confirmedBookings')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                <div className="w-4 h-4 max-lg:w-3 max-lg:h-3 bg-green-500 rounded-full"></div>
                {t('status.completed', 'Completed')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-green-900 dark:text-green-100">
                {filteredStats.completed_bookings}
              </div>
              <p className="text-sm max-lg:text-xs text-green-700 dark:text-green-300 mt-1">
                {t('partner.analytics.completedBookings')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200 dark:border-pink-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-pink-900 dark:text-pink-100 flex items-center gap-2">
                <div className="w-4 h-4 max-lg:w-3 max-lg:h-3 bg-pink-500 rounded-full"></div>
                {t('status.cancelled', 'Cancelled')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-pink-900 dark:text-pink-100">
                {filteredStats.cancelled_bookings}
              </div>
              <p className="text-sm max-lg:text-xs text-pink-700 dark:text-pink-300 mt-1">
                {t('partner.analytics.cancelledBookings')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800/30 dark:to-red-700/30 border-red-300 dark:border-red-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                <div className="w-4 h-4 max-lg:w-3 max-lg:h-3 bg-red-600 rounded-full"></div>
                {t('status.rejected', 'Rejected')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-red-800 dark:text-red-200">
                {filteredStats.rejected_bookings}
              </div>
              <p className="text-sm max-lg:text-xs text-red-600 dark:text-red-400 mt-1">
                {t('partner.analytics.rejectedBookings')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-600 to-red-700 dark:from-red-800 dark:to-red-900 border-red-500 dark:border-red-600 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 max-lg:pb-1 p-6 max-lg:p-4">
              <CardTitle className="text-lg max-lg:text-base font-semibold text-white dark:text-red-100 flex items-center gap-2">
                <div className="w-4 h-4 max-lg:w-3 max-lg:h-3 bg-white rounded-full"></div>
                {t('status.expired', 'Expired')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-lg:p-4">
              <div className="text-3xl max-lg:text-2xl font-bold text-white dark:text-red-100">
                {filteredStats.expired_bookings}
              </div>
              <p className="text-sm max-lg:text-xs text-red-100 dark:text-red-200 mt-1">
                {t('partner.analytics.expiredBookings')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default Analytics;