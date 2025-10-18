import { useUserBookings } from "@/hooks/useBookings";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBookingTimeDisplay } from "@/utils/bookingDisplay";
import DiscountBadgeList from "./DiscountBadgeList";
import { 
  CalendarDays, 
  Clock, 
  Users, 
  MapPin, 
  Star, 
  Search, 
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  Heart,
  MessageCircle,
  ChevronDown,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatFullDate, formatDateWithLocale } from "@/lib/dateUtils";
import BookingTimer from "@/components/BookingTimer";
import React, { useState, useMemo } from "react";
import { getBookingStatusInfo } from "@/utils/bookingStatus";
import { useReviewedBookingIds } from "@/hooks/useReviews";
import ReviewDialog from "@/components/ReviewDialog";
import { cn } from "@/lib/utils";
import { getBookingIdDisplay } from "@/utils/bookingIdUtils";
import { getTableLabel, getGuestLabel } from "@/utils/pricingLabels";

const BookingHistory = () => {
  const { t, i18n } = useTranslation();
  const { data: bookings, isLoading, error } = useUserBookings();
  const navigate = useNavigate();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Get reviewed booking IDs to hide review buttons for already reviewed bookings
  const { data: reviewedBookingIds } = useReviewedBookingIds();
  
  // Enable real-time booking status updates
  useRealtimeBookings();

  const openDetailsDialog = (booking: any) => {
    setSelectedBooking(booking);
    setDetailsDialogOpen(true);
  };

  const closeDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedBooking(null);
  };

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    let filtered = bookings;

    // Filter by status tab
    if (activeTab !== "all") {
      filtered = filtered.filter(booking => {
        const statusInfo = getBookingStatusInfo(booking);
        switch (activeTab) {
          case "active":
            return booking.status === 'confirmed' && statusInfo.isConfirmed;
          case "completed":
            return statusInfo.isCompleted;
          case "pending":
            return booking.status === 'pending';
          case "cancelled":
            return booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'expired';
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.venues?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.venues?.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [bookings, activeTab, searchQuery]);

  // Get booking counts for tabs
  const bookingCounts = useMemo(() => {
    if (!bookings) return { all: 0, active: 0, completed: 0, pending: 0, cancelled: 0 };

    return {
      all: bookings.length,
      active: bookings.filter(booking => {
        const statusInfo = getBookingStatusInfo(booking);
        return booking.status === 'confirmed' && statusInfo.isConfirmed;
      }).length,
      completed: bookings.filter(booking => getBookingStatusInfo(booking).isCompleted).length,
      pending: bookings.filter(booking => booking.status === 'pending').length,
      cancelled: bookings.filter(booking => 
        booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'expired'
      ).length,
    };
  }, [bookings]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatTime = (timeString: string) => {
    return timeString.split(':').slice(0, 2).join(':');
  };

  const getStatusIcon = (booking: any) => {
    const statusInfo = getBookingStatusInfo(booking);
    
    if (booking.status === 'pending') {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    } else if (statusInfo.isCompleted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (booking.status === 'confirmed') {
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (booking: any) => {
    const statusInfo = getBookingStatusInfo(booking);
    
    if (booking.status === 'pending') {
      return t('booking.pending', 'Pending');
    } else if (booking.status === 'completed') {
      return t('booking.completed', 'Completed');
    } else if (statusInfo.isCompleted) {
      return t('booking.completed', 'Completed');
    } else if (booking.status === 'confirmed') {
      return t('booking.active', 'Active');
    } else if (booking.status === 'cancelled') {
      return t('booking.cancelled', 'Cancelled');
    } else if (booking.status === 'rejected') {
      return t('booking.rejected', 'Rejected');
    } else if (booking.status === 'expired') {
      return t('booking.expired', 'Expired');
    }
    return booking.status;
  };

  const getStatusColor = (booking: any) => {
    const statusInfo = getBookingStatusInfo(booking);
    
    if (booking.status === 'pending') {
      return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700";
    } else if (statusInfo.isCompleted) {
      return "bg-green-50 text-green-700 border-green-200 dark:bg-gray-600 dark:text-white dark:border-gray-500";
    } else if (booking.status === 'confirmed') {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700";
    } else {
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-600 dark:text-white dark:border-gray-500";
    }
  };

  const getTotalGuests = (booking: any) => {
    if (!booking.booking_services || booking.booking_services.length === 0) {
      return booking.guest_count || 0;
    }
    
    return booking.booking_services.reduce((total, service) => {
      const isTableWiseService = service.venue_services?.pricing_model && 
        ['table_wise', 'per_table'].includes(service.venue_services.pricing_model);
      return total + (isTableWiseService ? 0 : service.guest_count);
    }, 0);
  };

  const getTotalTables = (booking: any) => {
    if (!booking.booking_services || booking.booking_services.length === 0) {
      return 0;
    }
    
    return booking.booking_services.reduce((total, service) => {
      if (service.table_configurations && service.table_configurations.length > 0) {
        return total + service.table_configurations.length;
      }
      return total + 1;
    }, 0);
  };

  // Helper function to get the most common table label from booking services
  const getBookingTableLabel = (booking: any) => {
    if (!booking.booking_services || booking.booking_services.length === 0) {
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
    if (!booking.booking_services || booking.booking_services.length === 0) {
      return t('pricing.guest');
    }
    
    const currentLanguage = i18n.language as 'en' | 'ka';
    const firstService = booking.booking_services[0];
    if (firstService?.venue_services) {
      return getGuestLabel(firstService.venue_services, t('pricing.guest'), currentLanguage);
    }
    return t('pricing.guest');
  };

  const handleReviewClick = (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewBooking(booking);
    setReviewDialogOpen(true);
  };

  const tabs = [
    { id: "all", label: t('booking.all', 'All'), count: bookingCounts.all },
    { id: "active", label: t('booking.active', 'Active'), count: bookingCounts.active },
    { id: "completed", label: t('booking.completed', 'Completed'), count: bookingCounts.completed },
    { id: "pending", label: t('booking.pending', 'Pending'), count: bookingCounts.pending },
    { id: "cancelled", label: t('booking.cancelled', 'Cancelled'), count: bookingCounts.cancelled },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex space-x-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded px-4 animate-pulse w-20"></div>
            ))}
          </div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-200 h-48 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('booking.failedToLoad', 'Failed to load bookings')}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t('booking.tryAgain', 'Please try refreshing the page')}
        </p>
        <Button onClick={() => window.location.reload()}>
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {t('booking.yourBookings', 'Your Bookings')}
            </h1>
            <div className="text-sm text-muted-foreground">
              {bookingCounts.all} {t('booking.totalBookings', 'total bookings')}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('booking.searchBookings', 'Search venues or locations...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-muted dark:bg-[hsl(var(--dark-surface-2))] text-muted-foreground dark:text-[hsl(var(--text-secondary))] hover:bg-muted/80 dark:hover:bg-[hsl(var(--dark-surface-3))]"
                )}
              >
                {tab.label}
                <Badge variant="secondary" className="bg-background/20 text-current">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted dark:bg-[hsl(var(--dark-surface-2))] rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">
              {searchQuery || activeTab !== 'all' 
                ? t('booking.noMatchingBookings', 'No matching bookings')
                : t('booking.noBookingsFound', 'No bookings found')
              }
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {searchQuery || activeTab !== 'all'
                ? t('booking.tryDifferentFilters', 'Try adjusting your search or filters to find what you\'re looking for.')
                : t('booking.startBooking', 'Start exploring venues and make your first booking!')
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(searchQuery || activeTab !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                  }}
                >
                  {t('common.clearFilters', 'Clear Filters')}
                </Button>
              )}
              <Button onClick={() => navigate('/')}>
                {t('common.browseVenues', 'Browse Venues')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusInfo = getBookingStatusInfo(booking);
              const totalGuests = getTotalGuests(booking);
              const totalTables = getTotalTables(booking);
              const canReview = statusInfo.isCompleted && !reviewedBookingIds?.has(booking.id);
              const hasReviewed = statusInfo.isCompleted && reviewedBookingIds?.has(booking.id);

              return (
                <Card 
                  key={booking.id} 
                  className="booking-history-card hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/venue/${booking.venue_id}`)}
                >
                  <CardContent className="p-0">
                    <div className="card-content">
                      {/* Image */}
                      <div className="image-container">
                        <img
                          src={booking.venues?.images?.[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800'}
                          alt={booking.venues?.name || t('venue.location')}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Status Badge */}
                        <div className="status-badge">
                          {booking.status === 'pending' ? (
                            <BookingTimer 
                              createdAt={booking.created_at}
                              status={booking.status}
                              className="shadow-md"
                            />
                          ) : (
                            <Badge className={cn("flex items-center gap-1 shadow-md", getStatusColor(booking))}>
                              {getStatusIcon(booking)}
                              {getStatusText(booking)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="content-container">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="venue-title group-hover:text-primary transition-colors">
                                {booking.venues?.name || 'Venue'}
                              </h3>
                              <div className="text-xs text-muted-foreground mt-1">
                                {getBookingIdDisplay(booking.id)}
                              </div>
                              <div className="venue-location">
                                <MapPin className="w-4 h-4" />
                                {booking.venues?.location}
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className="price-amount">
                                {booking.total_price} {t('booking.currency', 'GEL')}
                              </div>
                              <div className="price-label">
                                {t('booking.totalPrice', 'Total Price')}
                              </div>
                            </div>
                            
                          </div>

                          {/* Compact Booking Summary */}
                          <div className="booking-summary mb-3">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-[hsl(var(--text-secondary))]">
                              <div className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4 text-primary" />
                                <span className="font-medium">{formatDate(booking.booking_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {booking.booking_services && booking.booking_services.length > 0 
                                    ? `${booking.booking_services.length} ${t('booking.services', 'services')}`
                                    : formatTime(booking.booking_time)
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="font-medium">
                                  {totalGuests > 0 && `${totalGuests} ${t('booking.guests', { guest: getBookingGuestLabel(booking) })}`}
                                  {totalGuests > 0 && totalTables > 0 && " • "}
                                  {totalTables > 0 && `${totalTables} ${t('booking.tables', { table: getBookingTableLabel(booking) })}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Reservation Date/Time - Mobile Only */}
                          <div className="max-lg:mb-3 lg:hidden">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {t('booking.reserved', 'Reserved')}: {format(new Date(booking.created_at), "MMM d, yyyy, h:mm a")}
                              </span>
                            </div>
                          </div>

                          {/* Expandable Details */}
                          <div className="expandable-section">
                            {/* The expanded content is now in the dialog */}
                          </div>
                        </div>

                        {/* Actions and Show Details - Bottom Section */}
                        <div className="bottom-actions">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailsDialog(booking);
                              }}
                              className="expand-button"
                            >
                              <span className="text-sm font-medium text-primary">
                                {t('booking.showDetails', 'Show Details')}
                              </span>
                              <ExternalLink className="w-4 h-4 text-primary transition-transform duration-200" />
                            </button>

                            <div className="actions-container">
                              {canReview && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => handleReviewClick(booking, e)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {t('review.rateExperience', 'Rate Experience')}
                                </Button>
                              )}
                              
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/venue/${booking.venue_id}`);
                                }}
                              >
                                {t('booking.bookAgain', 'Book Again')}
                              </Button>
                              
                              {hasReviewed && (
                                <div className="flex items-center gap-1 px-3 py-2 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-sm rounded-md">
                                  <Star className="w-4 h-4 fill-current" />
                                  {t('review.reviewed', 'Reviewed')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {reviewBooking && (
        <ReviewDialog
          isOpen={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setReviewBooking(null);
          }}
          bookingId={reviewBooking.id}
          venueId={reviewBooking.venue_id}
          venueName={reviewBooking.venues?.name || 'Venue'}
        />
      )}

      {/* Booking Details Dialog */}
      {selectedBooking && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${detailsDialogOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto max-lg:max-w-sm max-lg:mx-2 max-lg:max-h-[85vh]">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-[hsl(var(--border))] max-lg:p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary max-lg:w-5 max-lg:h-5" />
                <h2 className="text-xl font-bold text-foreground max-lg:text-lg">
                  {t('booking.bookingDetails', 'Booking Details')}
                </h2>
              </div>
              <button
                onClick={closeDetailsDialog}
                className="p-2 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-2))] rounded-lg transition-colors max-lg:p-1"
              >
                <X className="w-5 h-5 text-muted-foreground max-lg:w-4 max-lg:h-4" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 max-lg:p-4">
              {/* Venue Information */}
              <div className="flex items-start gap-4 mb-6 max-lg:gap-3 max-lg:mb-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 max-lg:w-16 max-lg:h-16">
                  <img
                    src={selectedBooking.venues?.images?.[0] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800'}
                    alt={selectedBooking.venues?.name || t('venue.location')}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1 max-lg:text-base">
                    {selectedBooking.venues?.name || 'Venue'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground max-lg:flex-col max-lg:gap-1 max-lg:items-start">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                      <span className="max-lg:text-xs">Scheduled: {formatFullDate(new Date(selectedBooking.booking_date))}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                      <span className="max-lg:text-xs">Requested: {formatDateWithLocale(new Date(selectedBooking.created_at), "EEE, MMM d, HH:mm")}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right max-lg:text-center">
                  <div className="text-2xl font-bold text-primary mb-1 max-lg:text-lg">
                    {selectedBooking.total_price} {t('booking.currency', 'GEL')}
                  </div>
                  <Badge className={cn("flex items-center gap-1 max-lg:text-xs", getStatusColor(selectedBooking))}>
                    {getStatusIcon(selectedBooking)}
                    {getStatusText(selectedBooking)}
                  </Badge>
                </div>
              </div>

              {/* Customer Information */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg max-lg:mb-4 max-lg:p-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 max-lg:text-xs">
                  <MessageCircle className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                  <span className="font-medium">{t('booking.customerInfo', 'Customer Information')}:</span>
                  <span>{(selectedBooking as any).user_email || t('booking.noEmail', 'No email provided')}</span>
                </div>
              </div>

              {/* Service Breakdown */}
              {selectedBooking.booking_services && selectedBooking.booking_services.length > 0 && (
                <div className="mb-6 max-lg:mb-4">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 max-lg:text-base max-lg:mb-3">
                    <Clock className="w-5 h-5 text-primary max-lg:w-4 max-lg:h-4" />
                    {t('booking.serviceBreakdown', 'Service Breakdown')}
                  </h4>
                  
                  <div className="space-y-4 max-lg:space-y-3">
                    {selectedBooking.booking_services.map((service: any, index: number) => {
                      const serviceName = service.venue_services?.services?.name || t('venue.services');
                      const duration = formatBookingTimeDisplay(
                        service.arrival_datetime,
                        service.departure_datetime
                      );
                      const tableCount = service.table_configurations ? service.table_configurations.length : 1;
                      
                      return (
                        <div key={service.id} className="p-4 border border-gray-200 rounded-lg max-lg:p-3">
                          <div className="flex justify-between items-start mb-3 max-lg:mb-2">
                            <div className="flex-1">
                              <h5 className="text-lg font-semibold text-foreground mb-2 max-lg:text-base max-lg:mb-1">
                                {serviceName}
                              </h5>
                              {/* Service discount badges */}
                              <div className="mb-2">
                                <DiscountBadgeList
                                  discountData={{
                                    overallDiscountPercent: service.venue_services?.overall_discount_percent,
                                    groupDiscounts: service.venue_services?.group_discounts,
                                    timeslotDiscounts: service.venue_services?.timeslot_discounts,
                                    freeHourDiscounts: service.venue_services?.free_hour_discounts
                                  }}
                                  serviceId={service.venue_services?.id}
                                  size="sm"
                                  maxBadges={4}
                                />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 max-lg:flex-col max-lg:gap-1 max-lg:items-start">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                                  <span className="max-lg:text-xs">{duration}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                                  <span className="max-lg:text-xs">{tableCount} {tableCount === 1 ? t('booking.table', { table: getBookingTableLabel(selectedBooking) }) : t('booking.tables', { table: getBookingTableLabel(selectedBooking) })}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right max-lg:text-center">
                              {(() => {
                                const original = Number(service.subtotal) || 0;
                                const discounted = Number((service as any).discounted_subtotal);
                                const hasDiscount = Number.isFinite(discounted) && discounted > 0 && discounted < original - 0.001;
                                return (
                                  <div className="flex flex-col items-end">
                                    {hasDiscount && (
                                      <div className="text-xs text-muted-foreground line-through max-lg:text-xs">
                                        {original.toFixed(2)} {t('booking.currency', 'GEL')}
                                      </div>
                                    )}
                                    <div className="text-xl font-bold text-green-600 max-lg:text-lg">
                                      {(hasDiscount ? discounted : original).toFixed(2)} {t('booking.currency', 'GEL')}
                                    </div>
                                    <div className="text-sm text-muted-foreground max-lg:text-xs">
                                      {service.price_per_hour} {t('booking.currency', 'GEL')}/{t('booking.perHour', 'hour')}
                                    </div>
                                  </div>
                                );
                              })()}
                              
                            </div>
                          </div>
                          
                          {/* Guest Distribution */}
                          {service.table_configurations && service.table_configurations.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 max-lg:mt-3 max-lg:pt-3">
                              <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 max-lg:text-xs max-lg:mb-2">
                                <MapPin className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                                {t('booking.guestDistribution', 'Guest Distribution')}
                              </h6>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-lg:grid-cols-2 max-lg:gap-2">
                                {service.table_configurations.map((table: any, tableIndex: number) => (
                                  <div key={tableIndex} className="p-3 bg-blue-50 rounded-lg border border-blue-200 max-lg:p-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-1 max-lg:text-xs max-lg:mb-0.5">
                                      <Users className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                                      <span>{t('booking.table', { table: getBookingTableLabel(selectedBooking) })} {table.table_number || tableIndex + 1}</span>
                                    </div>
                                    <div className="text-sm text-blue-700 max-lg:text-xs">
                                      {table.guest_count || service.guest_count} {t('booking.guests', { guest: getBookingGuestLabel(selectedBooking) })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-lg:mb-4 max-lg:p-2">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 max-lg:w-3 max-lg:h-3" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800 mb-1 max-lg:text-xs">
                        {t('venue.specialRequests', 'Special Requests')}
                      </div>
                      <div className="text-sm text-yellow-700 max-lg:text-xs">
                        {selectedBooking.special_requests}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Message */}
              {selectedBooking.status === 'rejected' && selectedBooking.rejection_message && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg max-lg:mb-4 max-lg:p-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 max-lg:w-3 max-lg:h-3" />
                    <div>
                      <div className="text-sm font-medium text-red-800 mb-1 max-lg:text-xs">
                        {t('booking.rejection.reason', 'Rejection Reason')}
                      </div>
                      <div className="text-sm text-red-700 max-lg:text-xs">
                        {selectedBooking.rejection_message}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600 max-lg:text-xs">
                <MapPin className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                <span>{selectedBooking.venues?.location}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingHistory;