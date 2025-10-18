import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { Users, LogOut, Calendar, Package, Clock, Settings, User, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import ThemeToggle from '@/components/ThemeToggle';
import { SchedulerStandalone } from './calendar/SchedulerStandalone';
import { ProductsStockManagement } from '@/components/ProductsStockManagement';
import { SettingsPanel } from './calendar/components/SettingsPanel';
import { SettingsProvider } from './calendar/context/SettingsContext';
import { useEmployeeRealtimeBookings } from '@/hooks/useEmployeeRealtimeBookings';
import { useEmployeePendingBookings } from '@/hooks/useEmployeePendingBookings';
import { useTimerSync } from '@/hooks/useTimerSync';
import BookingTimer from '@/components/BookingTimer';
import BookingDetailsDialog from '@/components/BookingDetailsDialog';
import BookingRejectionDialog from '@/components/BookingRejectionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { getTableLabel, getGuestLabel } from '@/utils/pricingLabels';
import { formatBookingTimeDisplay } from '@/utils/bookingDisplay';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import { audioAlert } from '@/utils/audioAlert';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Type for employee booking data
interface EmployeeBooking {
  id: string;
  booking_date: string;
  total_price: number;
  status: string;
  user_email: string;
  venue_name: string;
  created_at: string;
  venue_id?: string;
  venue_images?: string[];
  special_requests?: string;
  booking_services?: Array<{
    id: string;
    service_id: string;
    arrival_datetime: string;
    departure_datetime: string;
    guest_count: number;
    table_configurations: any;
    price_per_hour: number;
    duration_hours: number;
    subtotal: number;
    venue_services: {
      services: {
        name: string;
      };
    };
  }>;
}

const EmployeeDashboard = () => {
  const { employee, signOut } = useEmployeeAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'calendar' | 'products' | 'bookings' | 'settings'>('calendar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EmployeeBooking | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [isRejectProcessing, setIsRejectProcessing] = useState(false);
  const [audioReady, setAudioReady] = useState<boolean>(() => {
    const status = audioAlert.getStatus();
    return !!status.audioContextState && status.audioContextState === 'running';
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enable real-time booking updates
  useEmployeeRealtimeBookings();

  // Ensure employee dashboard uses admin-configured timeout
  const { timeoutMinutes } = useTimerSync();
  console.log('👷 Employee Dashboard - Using admin timeout:', timeoutMinutes, 'minutes');

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


  // Fetch pending bookings for employee's venue
  const { data: pendingBookings, isLoading: pendingBookingsLoading } = useEmployeePendingBookings(employee?.venue_id || '') as {
    data: EmployeeBooking[] | undefined;
    isLoading: boolean;
  };


  // Utility functions for booking display
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return t('booking.status.confirmed', 'Confirmed');
      case 'pending':
        return t('booking.status.pending', 'Pending');
      case 'rejected':
        return t('booking.status.rejected', 'Rejected');
      case 'cancelled':
        return t('booking.status.cancelled', 'Cancelled');
      case 'completed':
        return t('booking.status.completed', 'Completed');
      case 'expired':
        return t('booking.status.expired', 'Expired');
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };


  const getTotalGuests = (booking: EmployeeBooking) => {
    if (!booking.booking_services || booking.booking_services.length === 0) return 0;
    return booking.booking_services.reduce((total: number, service) => total + service.guest_count, 0);
  };

  const getTotalTables = (booking: EmployeeBooking) => {
    if (!booking.booking_services || booking.booking_services.length === 0) return 0;
    return booking.booking_services.reduce((total: number, service) => {
      const tableConfigs = service.table_configurations || [];
      return total + tableConfigs.length;
    }, 0);
  };

  const handleCardClick = (booking: EmployeeBooking) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/employee/auth', { replace: true });
  };

  // Fallback sound trigger: play a sound if pending bookings count increases
  React.useEffect(() => {
    if (!pendingBookings) return;

    // Track previous count using a ref
    const prevKey = '__employee_prev_pending_count__';
    let previousCount = 0;
    try {
      const stored = sessionStorage.getItem(prevKey);
      previousCount = stored ? parseInt(stored, 10) : 0;
    } catch {}

    const currentCount = pendingBookings.length;

    // If count increased, trigger notifications
    if (currentCount > previousCount && previousCount > 0) {
      // Show visual toast notification
      toast({
        title: '🔔 New Booking Request!',
        description: `You have ${currentCount} pending booking${currentCount !== 1 ? 's' : ''} awaiting confirmation`,
        duration: 5000,
      });

      // Play sound if audio is ready
      if (audioReady) {
        (async () => {
          try {
            await audioAlert.forceResumeAudio();
            await audioAlert.playBookingSoundWithRetry(3);
            console.log('🔊 Employee: Fallback sound played due to pending bookings increase', { previousCount, currentCount });
          } catch (e) {
            console.warn('🔇 Employee: Fallback sound failed', e);
          }
        })();
      }
    }

    // Persist current count for next comparison
    try {
      sessionStorage.setItem(prevKey, String(currentCount));
    } catch {}

    // Also update when component unmounts or deps change
    return () => {
      try { sessionStorage.setItem(prevKey, String(currentCount)); } catch {}
    };
  }, [pendingBookings, audioReady, toast]);

  // Ensure audio is enabled for realtime alerts across browsers
  React.useEffect(() => {
    const tryEnableAudio = async () => {
      const status = audioAlert.getStatus();
      if (status.audioContextState !== 'running') {
        await audioAlert.emergencyAudioInit();
        const newStatus = audioAlert.getStatus();
        setAudioReady(newStatus.audioContextState === 'running');
      } else {
        setAudioReady(true);
      }
    };

    // Attempt once on mount
    tryEnableAudio();

    // Resume audio context if the tab becomes visible again
    const onVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const ok = await audioAlert.forceResumeAudio();
        if (ok) setAudioReady(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Smart-first-click: if audio isn't ready, capture the first user interaction anywhere to enable it
  React.useEffect(() => {
    if (audioReady) return;
    const handler = async () => {
      try {
        await handleEnableSound();
      } catch {}
    };
    const options: AddEventListenerOptions = { once: true, capture: true, passive: true } as any;
    document.addEventListener('pointerdown', handler, options);
    document.addEventListener('keydown', handler, options);
    document.addEventListener('touchstart', handler, options);
    return () => {
      document.removeEventListener('pointerdown', handler, options as any);
      document.removeEventListener('keydown', handler, options as any);
      document.removeEventListener('touchstart', handler, options as any);
    };
  }, [audioReady]);

  const handleEnableSound = async () => {
    console.log('🔊 Employee: Enable Sound button clicked');
    
    try {
      // Perform emergency audio initialization
      console.log('🔊 Employee: Initializing audio system...');
      const initSuccess = await audioAlert.emergencyAudioInit();
      console.log('🔊 Employee: Audio init result:', initSuccess);
      
      // Get current status
      const status = audioAlert.getStatus();
      console.log('🔊 Employee: Audio status after init:', status);
      
      // Try to play a test sound
      console.log('🔊 Employee: Playing test sound...');
      const testResult = await audioAlert.testSound();
      console.log('🔊 Employee: Test sound result:', testResult);
      
      // Set audio ready based on status
      const isReady = status.audioContextState === 'running' && status.userInteracted;
      setAudioReady(isReady);
      
      // Save to localStorage
      try { 
        localStorage.setItem('employee_audio_enabled', 'true'); 
        console.log('🔊 Employee: Audio enabled flag saved to localStorage');
      } catch {}
      
      if (isReady) {
        toast({ 
          title: '🔊 Sound Enabled!', 
          description: 'You will now hear notifications for new booking requests',
          duration: 3000
        });
        console.log('✅ Employee: Audio system successfully enabled');
      } else {
        toast({ 
          title: '⚠️ Audio Issue', 
          description: 'Audio system initialized but may need browser permission. Check your browser settings.',
          variant: 'destructive',
          duration: 5000
        });
        console.warn('⚠️ Employee: Audio system initialized but not fully ready');
      }
      
    } catch (error) {
      console.error('❌ Employee: Failed to enable audio:', error);
      setAudioReady(false);
      toast({ 
        title: '❌ Audio Failed', 
        description: 'Unable to initialize audio. Check browser autoplay permissions and try again.',
        variant: 'destructive',
        duration: 5000
      });
    }
  };

  const handleAccept = async (bookingId: string, paymentMethod?: string) => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('booking-confirmation', {
        body: { 
          bookingId, 
          action: 'confirmed',
          paymentMethod: paymentMethod || null
        }
      });
      if (error) throw error;
      toast({ title: t('employee.bookingConfirmed') });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', employee?.venue_id] }),
      ]);
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: t('employee.bookingConfirmedFailed'), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (bookingId: string) => {
    // Open rejection dialog to capture reason
    setRejectBookingId(bookingId);
    setIsRejectDialogOpen(true);
  };

  const handleRejectWithMessage = (booking: EmployeeBooking) => {
    setRejectBookingId(booking.id);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = async (message: string) => {
    if (!rejectBookingId) return;
    try {
      setIsRejectProcessing(true);
      const { data, error } = await supabase.functions.invoke('booking-confirmation', {
        body: { bookingId: rejectBookingId, action: 'rejected', rejectionMessage: message || '' }
      });
      if (error) throw error;
      toast({ title: t('employee.bookingRejected') });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', employee?.venue_id] }),
      ]);
      setIsRejectDialogOpen(false);
      setIsDialogOpen(false);
    } catch (e) {
      toast({ title: t('employee.bookingRejectedFailed'), variant: 'destructive' });
    } finally {
      setIsRejectProcessing(false);
      setRejectBookingId(null);
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading employee access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-employee-layout="true">
      {/* Employee Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Employee Dashboard
                  </h1>
                </div>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('employee.dashboard.welcomeBack')}, {employee.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('employee.dashboard.venueName')}: {employee.venues.name}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Employee
              </Badge>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('employee.dashboard.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-full mx-auto">
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'calendar'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                    activeTab === 'bookings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Clock className="h-4 w-4 inline mr-2" />
                  Pending Bookings
                  {pendingBookings && pendingBookings.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">
                      {pendingBookings.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'products'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Package className="h-4 w-4 inline mr-2" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'calendar' && (
            <>
              {/* Pending Bookings Alert Banner */}
              {pendingBookings && pendingBookings.length > 0 && (
                <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-300 dark:border-orange-600 rounded-lg p-4 shadow-md animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-orange-500 dark:bg-orange-600 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                          {pendingBookings.length} Pending Booking{pendingBookings.length !== 1 ? 's' : ''} Awaiting Confirmation
                        </h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Click the "Pending Bookings" tab to review and respond to booking requests
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setActiveTab('bookings')}
                      className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
                    >
                      View Bookings
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SchedulerStandalone 
                  title="Calendar"
                  showSettings={false}
                  venueId={employee.venue_id}
                  className="employee-calendar"
                />
              </div>
            </>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-lg">
              <div className="p-6 border-b border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/30 dark:to-blue-800/30 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 dark:bg-purple-600 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {t('employee.dashboard.pendingRequests')}
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      {t('employee.dashboard.pendingRequestsDescription')} for {employee.venues.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {pendingBookingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : pendingBookings && pendingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pendingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 border-2 border-purple-200 dark:border-purple-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                        onClick={() => handleCardClick(booking)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">{booking.venue_name}</h4>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {getBookingIdDisplay(booking.id)}
                              </div>
                              {booking.status === 'pending' ? (
                                <BookingTimer createdAt={booking.created_at} status={booking.status} />
                              ) : (
                                <Badge className={getStatusColor(booking.status)}>
                                  {getStatusLabel(booking.status)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(booking.booking_date)}
                              <Clock className="h-4 w-4 ml-3 mr-1" />
                              {booking.booking_services && booking.booking_services.length > 0 
                                ? formatBookingTimeDisplay(
                                    booking.booking_services[0].arrival_datetime,
                                    booking.booking_services[0].departure_datetime
                                  )
                                : 'N/A'
                              }
                              <Users className="h-4 w-4 ml-3 mr-1" />
                              {(() => {
                                const totalGuests = getTotalGuests(booking);
                                return `${totalGuests} ${totalGuests !== 1 ? t('booking.guests', { guest: getBookingGuestLabel(booking) }) : t('booking.guest', { guest: getBookingGuestLabel(booking) })}`;
                              })()}
                              {getTotalTables(booking) > 0 && (
                                <span className="ml-1">• {getTotalTables(booking)} {getTotalTables(booking) !== 1 ? t('booking.tables', { table: getBookingTableLabel(booking) }) : t('booking.table', { table: getBookingTableLabel(booking) })}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <User className="h-4 w-4 inline mr-1" />
                              {booking.user_email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{booking.total_price.toFixed(2)} {t('booking.currency')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Play className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t('employee.dashboard.noPendingRequests', 'No pending requests right now')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('employee.dashboard.noPendingRequestsDescription', 'New requests will appear here instantly')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Available Products
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage product stock and availability at {employee.venues.name}
                  </p>
                </div>
                <ProductsStockManagement 
                  venueId={employee.venue_id}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <SettingsProvider>
                  <SettingsPanel />
                </SettingsProvider>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Details Dialog - Reusable Component */}
      <BookingDetailsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        booking={selectedBooking ? {
          id: selectedBooking.id,
          booking_date: selectedBooking.booking_date,
          total_price: selectedBooking.total_price,
          user_email: selectedBooking.user_email || 'Unknown',
          special_requests: selectedBooking.special_requests,
          venue_name: selectedBooking.venue_name || 'Venue',
          venue_id: selectedBooking.venue_id,
          venue_images: selectedBooking.venue_images,
          created_at: selectedBooking.created_at,
          status: selectedBooking.status,
          booking_services: selectedBooking.booking_services
        } : null}
        showActions={selectedBooking?.status === 'pending'}
        onAccept={handleAccept}
        onReject={handleReject}
        onRejectWithMessage={handleRejectWithMessage}
        isProcessing={isProcessing}
      />
      {selectedBooking && (
        <BookingRejectionDialog
          isOpen={isRejectDialogOpen}
          onClose={() => setIsRejectDialogOpen(false)}
          onConfirm={handleConfirmRejection}
          bookingId={rejectBookingId || selectedBooking.id}
          venueName={selectedBooking.venue_name}
          isLoading={isRejectProcessing}
        />
      )}
      {/* Audio enable modal appears whenever audio context isn't running */}
      {!audioReady && (() => {
        const status = audioAlert.getStatus();
        const needsEnable = !status.audioContextState || status.audioContextState !== 'running';
        if (!needsEnable) return null;
        return (
          <Dialog open={!audioReady} onOpenChange={() => {}}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Sound alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">This page plays sound.</p>
                <div className="flex justify-end gap-2">
                  <Button onClick={handleEnableSound}>OK</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};

export default EmployeeDashboard;
