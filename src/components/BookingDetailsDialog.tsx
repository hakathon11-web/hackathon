import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, MapPin, Mail, Building2, Grid3X3, MessageSquare, Check, X, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import BookingTimer from '@/components/BookingTimer';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { isPerTableService } from '@/constants/services';
import { formatBookingTimeDisplay } from '@/utils/bookingDisplay';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import DiscountBadgeList from './DiscountBadgeList';
import { getTableLabel, getGuestLabel } from '@/utils/pricingLabels';
import { useServiceDiscountCalculation } from '@/hooks/useVenueDiscountCalculation';

interface BookingService {
  id: string;
  service_id: string;
  arrival_datetime: string;
  departure_datetime: string;
  guest_count: number;
  price_per_hour: number;
  duration_hours: number;
  subtotal: number;
  discounted_subtotal?: number;
  table_configurations: any;
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
}

interface BookingDetailsData {
  id: string;
  booking_date: string;
  total_price: number;
  user_email: string;
  special_requests?: string;
  rejection_message?: string;
  venue_name: string;
  venue_id: string;
  venue_images?: string[];
  created_at: string;
  status: string;
  booking_services?: BookingService[];
}

interface BookingDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetailsData | null;
  showActions?: boolean;
  onAccept?: (bookingId: string, paymentMethod?: string) => void;
  onReject?: (bookingId: string) => void;
  onRejectWithMessage?: (booking: BookingDetailsData) => void;
  isProcessing?: boolean;
}

const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({
  isOpen,
  onClose,
  booking,
  showActions = false,
  onAccept,
  onReject,
  onRejectWithMessage,
  isProcessing = false
}) => {
  const { t } = useTranslation();
  const { translateService } = useServiceTranslation();
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  
  // Reset payment method when dialog opens/closes or booking changes
  React.useEffect(() => {
    if (!isOpen || !booking) {
      setPaymentMethod('card');
    }
  }, [isOpen, booking]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (i18n.language === 'ka') {
      // Georgian month names
      const georgianMonths = [
        'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
        'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
      ];
      
      const georgianWeekdays = [
        'კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'
      ];
      
      const weekday = georgianWeekdays[date.getDay()];
      const month = georgianMonths[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${weekday}, ${day} ${month}, ${year}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // Subcomponent to render discounted price per service using stored discounted_subtotal when available,
  // falling back to shared discount logic for backward compatibility
  const ServicePrice: React.FC<{ service: BookingService }> = ({ service }) => {
    const storedDiscounted = (service as any)?.discounted_subtotal as number | undefined;
    const basePrice = Number(service.subtotal) || 0;
    const durationHours = Number(service.duration_hours) || (() => {
      const start = new Date(service.arrival_datetime);
      const end = new Date(service.departure_datetime);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    })();
    const startTime = (() => {
      const d = new Date(service.arrival_datetime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    })();
    const endTime = (() => {
      const d = new Date(service.departure_datetime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    })();
    const isTableWise = isPerTableService(service?.venue_services?.services?.pricing_model);
    const serviceId = (service as any)?.venue_services?.id as string | undefined;

    const { data } = useServiceDiscountCalculation(
      serviceId,
      basePrice,
      durationHours,
      Number(service.guest_count) || 0,
      startTime,
      endTime,
      !storedDiscounted, // only compute if we don't already have a stored discounted value
      isTableWise
    );

    const original = basePrice;
    const final = (typeof storedDiscounted === 'number' && storedDiscounted > 0)
      ? storedDiscounted
      : (data?.finalPrice ?? basePrice);
    const isDiscounted = final < original - 0.001;

    return (
      <div className="text-right bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-200 dark:border-green-700 max-lg:px-2 max-lg:py-1">
        {isDiscounted ? (
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-xs text-muted-foreground line-through max-lg:text-[10px]">
              {original.toFixed(2)} {t('booking.currency')}
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400 max-lg:text-sm">
              {final.toFixed(2)} {t('booking.currency')}
            </div>
          </div>
        ) : (
          <div className="text-lg font-bold text-green-600 dark:text-green-400 max-lg:text-sm">
            {original.toFixed(2)} {t('booking.currency')}
          </div>
        )}
      </div>
    );
  };

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

  const formatTime = (timeString: string) => {
    if (!timeString) return t('partner.notifications.notSpecified');
    const [hours, minutes] = timeString.split(':');
    // Always use 24-hour format
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (isoOrDate?: string | Date | null) => {
    if (!isoOrDate) return '—';
    try {
      const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
      if (i18n.language === 'ka') {
        // Georgian month names (short)
        const georgianMonthsShort = [
          'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
          'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'
        ];
        
        const georgianWeekdaysShort = [
          'კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'
        ];
        
        const weekday = georgianWeekdaysShort[date.getDay()];
        const month = georgianMonthsShort[date.getMonth()];
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${weekday}, ${day} ${month}, ${hours}:${minutes}`;
      } else {
        // Always use 24-hour format for English too
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }) + `, ${hours}:${minutes}`;
      }
    } catch {
      return '—';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-600 dark:text-white dark:border-gray-500';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-600 dark:text-white dark:border-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return t('booking.pending') || 'Pending';
      case 'confirmed':
        return t('booking.confirmed') || 'Confirmed';
      case 'active':
        return t('booking.active') || 'Active';
      case 'completed':
        return t('booking.completed') || 'Completed';
      case 'rejected':
        return t('booking.rejected') || 'Rejected';
      case 'expired':
        return t('status.expired', 'Expired');
      default:
        return status;
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 max-lg:max-w-xs max-lg:max-h-[80vh]">
        <DialogHeader className="border-b p-6 pb-4 max-lg:p-3 max-lg:pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3 max-lg:text-sm max-lg:gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center max-lg:w-6 max-lg:h-6">
                  <Calendar className="w-4 h-4 text-primary max-lg:w-3 max-lg:h-3" />
                </div>
                {t('partner.notifications.bookingDetails')}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-6 max-lg:p-3 max-lg:space-y-3">
          {/* Essential Booking Info */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-6 border-2 border-primary/20 max-lg:rounded-lg max-lg:p-3 max-lg:border">
            <div className="flex items-center justify-between mb-4 max-lg:mb-2">
              <div className="flex items-center gap-4 max-lg:gap-2">
                {/* Venue Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 max-lg:w-10 max-lg:h-10 max-lg:rounded-lg">
                  {booking.venue_images && booking.venue_images.length > 0 ? (
                    <img 
                      src={booking.venue_images[0]} 
                      alt={booking.venue_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to Building2 icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${booking.venue_images && booking.venue_images.length > 0 ? 'hidden' : ''}`}>
                    <Building2 className="w-8 h-8 text-gray-400 max-lg:w-5 max-lg:h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground max-lg:text-sm">{booking.venue_name}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {getBookingIdDisplay(booking.id)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground max-lg:flex-col max-lg:gap-1 max-lg:items-start">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                      <span className="max-lg:text-xs">{t('partner.notifications.scheduledLabel')} {formatDate(booking.booking_date)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                      <span className="max-lg:text-xs">{t('partner.notifications.requestedLabel')} {formatDateTime(booking.created_at)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right max-lg:text-center">
                <div className="text-2xl font-bold text-primary max-lg:text-sm">
                  {booking.total_price.toFixed(2)} {t('booking.currency')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between max-lg:flex-col max-lg:gap-2 max-lg:items-start">
              <div className="flex items-center gap-2 text-sm text-muted-foreground max-lg:text-xs">
                <Mail className="w-4 h-4 max-lg:w-3 max-lg:h-3" />
                <span className="font-medium">{t('partner.notifications.customerInfo')}:</span>
                <span className="text-foreground">{booking.user_email}</span>
              </div>
              
              {/* Status Display */}
              <div>
                {booking.status === 'pending' ? (
                  <BookingTimer 
                    createdAt={booking.created_at}
                    status={booking.status}
                  />
                ) : (
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(booking.status)} border max-lg:text-xs`}
                  >
                    {getStatusText(booking.status)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Service Breakdown */}
          {booking.booking_services && booking.booking_services.length > 0 && (
            <div className="space-y-4 max-lg:space-y-2">
              <h4 className="text-lg font-semibold text-foreground max-lg:text-sm">
                {t('partner.notifications.serviceBreakdown')}
              </h4>
              
              <div className="grid gap-6 max-lg:gap-3">
                {booking.booking_services.map((service, index) => {
                  const serviceTableConfigs = typeof service.table_configurations === 'string' 
                    ? JSON.parse(service.table_configurations || '[]') 
                    : service.table_configurations || [];
                  
                  const serviceTables = new Set(
                    serviceTableConfigs.map((table: any) => table.table_number).filter((num: any) => num !== undefined)
                  ).size;

                  const isTableWise = isPerTableService(service?.venue_services?.services?.pricing_model);
                  const currentLanguage = i18n.language as 'en' | 'ka';
                  const perServiceTableLabel = getTableLabel(service?.venue_services, t('pricing.table'), currentLanguage);
                  const perServiceGuestLabel = getGuestLabel(service?.venue_services, t('pricing.guest'), currentLanguage);

                  return (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border-2 border-blue-100 dark:border-blue-800/50 shadow-sm max-lg:rounded-lg max-lg:p-3 max-lg:border">
                      <div className="flex items-center justify-between mb-4 max-lg:mb-2">
                        <div className="flex-1">
                          <h5 className="text-lg font-bold text-foreground mb-1 max-lg:text-sm max-lg:mb-0.5">
                            {service.venue_services?.services ? translateService({
                              name: service.venue_services.services.name,
                              name_en: service.venue_services.services.name_en,
                              name_ka: service.venue_services.services.name_ka
                            }) : t('common.service')}
                          </h5>
                          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full max-lg:w-8 max-lg:h-0.5 mb-2"></div>
                          {/* Service discount badges */}
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
                        <div className="flex items-center gap-2">
                          <ServicePrice service={service} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm max-lg:flex-col max-lg:gap-1 max-lg:items-start">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-primary max-lg:w-3 max-lg:h-3" />
                          <span className="max-lg:text-xs">
                            {formatBookingTimeDisplay(
                              service.arrival_datetime,
                              service.departure_datetime
                            )}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="max-lg:text-xs">
                            {serviceTables} {t('partner.notifications.tables', { table: perServiceTableLabel })}
                          </span>
                        </span>
                        {!isTableWise && (
                          <span className="flex items-center gap-1">
                            <span className="max-lg:text-xs">
                              {service.guest_count} {t('partner.notifications.guests', { guest: perServiceGuestLabel })}
                            </span>
                          </span>
                        )}
                      </div>
                      
                      {/* Guest Distribution */}
                      {serviceTableConfigs.length > 0 && !isTableWise && (
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700 max-lg:mt-2 max-lg:pt-2">
                          <h6 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 max-lg:text-xs max-lg:mb-2">
                            {perServiceGuestLabel} {t('common.distribution')}
                          </h6>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-lg:grid-cols-1 max-lg:gap-2">
                            {serviceTableConfigs.map((table: any, tableIndex: number) => (
                              <div key={tableIndex} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 max-lg:p-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1 max-lg:text-xs max-lg:mb-0.5">
                                  <span>{t('partner.notifications.table', { table: perServiceTableLabel })} {table.table_number || tableIndex + 1}</span>
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-400 max-lg:text-xs">
                                  {table.guest_count || service.guest_count} {t('partner.notifications.guests', { guest: perServiceGuestLabel })}
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
          {booking.special_requests && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800 max-lg:p-3 max-lg:border">
              <div className="flex items-center gap-2 mb-2 max-lg:mb-1">
                <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 max-lg:w-3 max-lg:h-3" />
                <span className="font-medium text-foreground max-lg:text-xs">{t('partner.notifications.specialRequests')}</span>
              </div>
              <p className="text-sm text-foreground max-lg:text-xs">"{booking.special_requests}"</p>
            </div>
          )}

          {/* Rejection Message */}
          {booking.status === 'rejected' && booking.rejection_message && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800 max-lg:p-3 max-lg:border">
              <div className="flex items-center gap-2 mb-2 max-lg:mb-1">
                <X className="w-4 h-4 text-red-600 dark:text-red-400 max-lg:w-3 max-lg:h-3" />
                <span className="font-medium text-foreground max-lg:text-xs">{t('booking.rejection.reason') || 'Rejection Reason'}</span>
              </div>
              <p className="text-sm text-foreground max-lg:text-xs">"{booking.rejection_message}"</p>
            </div>
          )}

          {/* Action Buttons - Only show if showActions is true */}
          {showActions && (
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 max-lg:rounded-lg max-lg:p-3 max-lg:border">
              
              {/* Show payment info for confirmed bookings */}
              {booking.status === 'confirmed' && (
                <div className="mb-6 max-lg:mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {t('employee.paymentMethod')}: {
                        booking.paymentMethod 
                          ? (booking.paymentMethod === 'card' 
                              ? t('employee.paymentMethodCard') 
                              : t('employee.paymentMethodCash'))
                          : t('employee.onlinePayment')
                      }
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-end gap-4 max-lg:gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (onRejectWithMessage) {
                      onRejectWithMessage(booking);
                    } else {
                      onReject?.(booking.id);
                    }
                  }}
                  disabled={isProcessing}
                  className="min-w-[140px] border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 max-lg:min-w-0 max-lg:text-sm max-lg:h-9"
                >
                  <X className="h-5 w-5 mr-2 max-lg:w-4 max-lg:h-4" />
                  {isProcessing ? t('partner.notifications.processing') : t('partner.notifications.reject')}
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    // Payment method is automatically set to 'card' for pending bookings
                    onAccept?.(booking.id, paymentMethod);
                  }}
                  disabled={isProcessing}
                  className="min-w-[140px] bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl max-lg:min-w-0 max-lg:text-sm max-lg:h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-5 w-5 mr-2 max-lg:w-4 max-lg:h-4" />
                  {isProcessing ? t('partner.notifications.processing') : t('employee.confirmBookingWithPayment')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsDialog;
