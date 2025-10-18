import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, X, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatDateWithLocale } from "@/lib/dateUtils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ServiceBookingDialog from "@/components/ServiceBookingDialog";
import { VenueService } from "@/hooks/useVenues";
import { calculateGuestPrice, getServicePricingSummary, getServiceDetailedPricing } from "@/utils/guestPricing";
import { getTableLabel, getGuestLabel } from "@/utils/pricingLabels";
import { useServiceDiscountCalculation } from "@/hooks/useVenueDiscountCalculation";
import ServiceDiscountIndicator from "@/components/ServiceDiscountIndicator";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { isPerTableService } from "@/constants/services";
import { useBookingFlowGuide } from "@/hooks/useBookingFlowGuide";
import BookingPaymentDialog from './BookingPaymentDialog';
import { useServicePrimaryImage } from "@/hooks/useServiceImages";

import { WorkingHours } from '@/components/DailyWorkingHours';

// Component to display service image using centralized images
const ServiceImageDisplay = ({ serviceId, serviceName, className = "w-16 h-16 object-cover rounded-xl flex-shrink-0" }: { 
  serviceId: string; 
  serviceName: string; 
  className?: string;
}) => {
  const { data: primaryImage } = useServicePrimaryImage(serviceId);
  
  if (!primaryImage) {
    return <div className={`bg-muted rounded-xl flex-shrink-0 ${className}`}></div>;
  }

  return (
    <img
      src={primaryImage.image_url}
      alt={primaryImage.alt_text || serviceName}
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
};
import { getTodaySchedule, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { generateTimeSlots as generateTimeSlotsUtil } from '@/utils/timeSlotGeneration';
import { validateBookingTimes, validateNotInPast } from '@/utils/timeValidation';
import { 
  validateBookingTimeRange, 
  validateDepartureTime, 
  getClosingTimeForDay 
} from '@/utils/bookingTimeValidation';

// Helper function to get opening time for a specific day
const getOpeningTimeForDay = (
  workingHours: WorkingHours | null,
  date: Date | undefined,
  fallbackOpeningTime?: string
): string | null => {
  if (!workingHours || !date) {
    return fallbackOpeningTime || null;
  }

  const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
  const dayOfWeek = dayKeys[date.getDay()];
  const daySchedule = workingHours[dayOfWeek] as any;

  if (!daySchedule || daySchedule.closed) {
    return null; // Venue is closed on this day
  }

  return daySchedule.open;
};

interface BookingFormProps {
  venueId: string;
  venueName: string;
  venuePrice: number;
  openingTime?: string;
  closingTime?: string;
  workingHours?: WorkingHours;
  defaultDiscount?: number;
  services?: VenueService[];
  selectedServiceId?: string;
  initialBookingData?: any;
  shouldAutoOpenBooking?: boolean;
  onBookingSuccess?: () => void;
  maxBookingDaysInAdvance?: number;
  venueDiscounts?: {
    overall_discount_percent?: number;
    overall_discount_service_ids?: string[];
    free_hour_discounts?: Array<{ thresholdHours: number; freeHours: number; serviceIds?: string[] }>;
    group_discounts?: Array<{ minGuests: number; discountPercent: number; serviceIds?: string[] }>;
    timeslot_discounts?: Array<{ start: string; end: string; discountPercent: number; serviceIds?: string[] }>;
  };
}

const BookingForm = ({ venueId, venueName, venuePrice, openingTime, closingTime, workingHours, defaultDiscount = 0, services = [], selectedServiceId, initialBookingData, shouldAutoOpenBooking = false, onBookingSuccess, maxBookingDaysInAdvance, venueDiscounts }: BookingFormProps) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();

  // Debug: Log the booking advance limit
  console.log('BookingForm - Max booking days in advance:', maxBookingDaysInAdvance);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Initialize default date
  const getDefaultDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // If venue is closed today, don't set today as default
    if (workingHours) {
      const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
      const key = dayKeys[today.getDay()];
      const schedule: any = (workingHours as any)[key];
      if (schedule && schedule.closed) {
        return undefined;
      }
    }
    return today;
  };
  
  const [formData, setFormData] = useState({
    date: getDefaultDate(),
    arrivalTime: '',
    departureTime: '',
    serviceBookings: [] as Array<{
      serviceId: string;
      arrivalTime: string;
      departureTime: string;
      numberOfTables?: number;
      tableConfigurations?: Array<{
        table_number: number;
        guest_count: number;
      }>;
      selectedGames?: string[];
      originalPrice?: number;
      finalPrice?: number;
      savings?: number;
      appliedDiscounts?: string[];
      discountBreakdown?: any;
    }>,
    guests: 1,
    serviceIds: selectedServiceId ? [selectedServiceId] : [] as string[],
    specialRequests: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogService, setDialogService] = useState<VenueService | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Debug: Track dialog state changes
  useEffect(() => {
    console.log('BookingForm - Dialog state changed:', { isDialogOpen, dialogService: dialogService?.name });
  }, [isDialogOpen, dialogService]);

  // Store dialog state in a ref to prevent loss during re-renders
  const dialogStateRef = useRef({ isOpen: false, service: null as VenueService | null });
  
  // Sync ref with state
  useEffect(() => {
    dialogStateRef.current = { isOpen: isDialogOpen, service: dialogService };
  }, [isDialogOpen, dialogService]);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentBookingData, setCurrentBookingData] = useState<any>(null);
  const draftStorageKey = `bookingDraft_${venueId}`;
  
  // Special requests character limit
  const SPECIAL_REQUESTS_MAX_LENGTH = 500;
  
  // Booking flow guide hook
  const bookingFlow = useBookingFlowGuide(
    formData.date,
    formData.serviceIds,
    formData.serviceBookings
  );
  

  // Update serviceIds when selectedServiceId prop changes
  useEffect(() => {
    if (selectedServiceId && !formData.serviceIds.includes(selectedServiceId)) {
      setFormData(prev => ({ ...prev, serviceIds: [selectedServiceId] }));
    }
  }, [selectedServiceId, formData.serviceIds]);

  // Hydrate form from initialBookingData when provided (e.g., returning from confirm & pay)
  useEffect(() => {
    // Prefer explicitly supplied initialBookingData; otherwise check for local draft
    const load = () => {
      if (initialBookingData) {
        try {
          const hydratedDate = initialBookingData.date ? new Date(initialBookingData.date) : undefined;
          setFormData({
            date: hydratedDate,
            arrivalTime: initialBookingData.arrivalTime || '',
            departureTime: initialBookingData.departureTime || '',
            serviceBookings: initialBookingData.serviceBookings || [],
            guests: initialBookingData.guests || 1,
            serviceIds: initialBookingData.serviceIds || [],
            specialRequests: initialBookingData.specialRequests || '',
          });
          return;
        } catch (_e) {}
      }
      try {
        const draft = localStorage.getItem(draftStorageKey);
        if (!draft) return;
        const parsed = JSON.parse(draft);
        const hydratedDate = parsed.date ? new Date(parsed.date) : undefined;
        setFormData({
          date: hydratedDate,
          arrivalTime: parsed.arrivalTime || '',
          departureTime: parsed.departureTime || '',
          serviceBookings: Array.isArray(parsed.serviceBookings) ? parsed.serviceBookings : [],
          guests: parsed.guests || 1,
          serviceIds: Array.isArray(parsed.serviceIds) ? parsed.serviceIds : [],
          specialRequests: parsed.specialRequests || '',
        });
      } catch {}
    };
    load();
  }, [initialBookingData, draftStorageKey]);

  // Persist form draft to localStorage as user edits, so OAuth round-trips don't lose data
  useEffect(() => {
    try {
      const payload = {
        date: formData.date ? formData.date.toISOString() : undefined,
        arrivalTime: formData.arrivalTime,
        departureTime: formData.departureTime,
        serviceBookings: formData.serviceBookings,
        guests: formData.guests,
        serviceIds: formData.serviceIds,
        specialRequests: formData.specialRequests,
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    } catch {}
  }, [formData, draftStorageKey]);

  // Auto-open payment dialog when returning from auth
  useEffect(() => {
    if (!shouldAutoOpenBooking || !user) return;

    // Wait until data is hydrated either from initialBookingData or form state
    const hasHydratedServices = (formData.serviceBookings && formData.serviceBookings.length > 0) ||
      (initialBookingData && Array.isArray(initialBookingData.serviceBookings) && initialBookingData.serviceBookings.length > 0);

    if (!hasHydratedServices) return;

    // Prefer the initialBookingData snapshot if present (contains prices)
    const source = initialBookingData || {
      date: formData.date?.toISOString(),
      arrivalTime: formData.arrivalTime,
      departureTime: formData.departureTime,
      serviceBookings: formData.serviceBookings,
      guests: formData.guests,
      serviceIds: formData.serviceIds,
      specialRequests: formData.specialRequests,
    };

    // Compute robust totals if missing
    const computeTotals = () => {
      const totals: number[] = [];
      const discounted = Number(source.discountedTotal);
      const original = Number(source.totalPrice);
      if (Number.isFinite(discounted) && discounted > 0) totals.push(discounted);
      if (Number.isFinite(original) && original > 0) totals.push(original);
      const servicesSum = Array.isArray(source.serviceBookings)
        ? source.serviceBookings.reduce((sum: number, sb: any) => {
            const fp = Number(sb?.finalPrice);
            const op = Number(sb?.originalPrice);
            if (Number.isFinite(fp) && fp > 0) return sum + fp;
            if (Number.isFinite(op) && op > 0) return sum + op;
            return sum;
          }, 0)
        : 0;
      if (servicesSum > 0) totals.push(servicesSum);
      const chosen = totals.length > 0 ? Math.max(...totals) : 0;
      return {
        totalPrice: chosen > 0 ? chosen : calculateOriginalTotalPrice(),
        discountedTotal: chosen > 0 ? chosen : calculateDiscountedTotalPrice(),
        totalSavings: Math.max(0, (chosen > 0 ? chosen : calculateOriginalTotalPrice()) - (chosen > 0 ? chosen : calculateDiscountedTotalPrice()))
      };
    };

    const totals = computeTotals();

    // Normalize date to 'yyyy-MM-dd' for Edge Function expectations
    const normalizedDate = (() => {
      try {
        if (typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)) {
          return source.date;
        }
        const d = source.date ? new Date(source.date) : (formData.date || new Date());
        return format(d as Date, 'yyyy-MM-dd');
      } catch {
        return format(new Date(), 'yyyy-MM-dd');
      }
    })();

    const bookingData = {
      venueId,
      venueName,
      date: normalizedDate,
      arrivalTime: source.arrivalTime || formData.arrivalTime || '16:00',
      departureTime: source.departureTime || formData.departureTime || '17:00',
      serviceBookings: source.serviceBookings || formData.serviceBookings,
      guests: source.guests || formData.guests,
      serviceIds: source.serviceIds || formData.serviceIds,
      totalPrice: totals.totalPrice,
      discountedTotal: totals.discountedTotal,
      totalSavings: totals.totalSavings,
      specialRequests: source.specialRequests || formData.specialRequests,
    };

    setCurrentBookingData(bookingData);
    setIsPaymentDialogOpen(true);
  }, [shouldAutoOpenBooking, user, venueId, venueName, formData, initialBookingData]);

  const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
  
  // Calculate original price (before discounts)
  const calculateOriginalTotalPrice = () => {
    if (services.length === 0) {
      // For basic venue booking
      if (!formData.arrivalTime || !formData.departureTime) return 0;
      
      // Parse time components to avoid timezone issues
      const [startHour, startMinute] = formData.arrivalTime.split(':').map(Number);
      const [endHour, endMinute] = formData.departureTime.split(':').map(Number);
      
      // Convert to minutes since midnight
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // Calculate duration in minutes
      let durationMinutes: number;
      if (endMinutes >= startMinutes) {
        // Same day booking
        durationMinutes = endMinutes - startMinutes;
      } else {
        // Overnight booking (departure is next day)
        durationMinutes = (24 * 60) - startMinutes + endMinutes;
      }
      
      const durationHours = durationMinutes / 60;
      return venuePrice * durationHours;
    }

    // For service bookings, calculate the original price (before discounts)
    let totalPrice = 0;
    formData.serviceBookings.forEach(serviceBooking => {
      // Use the original price if available, otherwise calculate manually
      if (serviceBooking.originalPrice !== undefined) {
        totalPrice += serviceBooking.originalPrice;
      } else {
        // Fallback to calculating manually (for backward compatibility)
        const service = services.find(s => s.id === serviceBooking.serviceId);
        if (service && serviceBooking.arrivalTime && serviceBooking.departureTime) {
          // Parse time components to avoid timezone issues
          const [startHour, startMinute] = serviceBooking.arrivalTime.split(':').map(Number);
          const [endHour, endMinute] = serviceBooking.departureTime.split(':').map(Number);
          
          // Convert to minutes since midnight
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          // Calculate duration in minutes
          let durationMinutes: number;
          if (endMinutes >= startMinutes) {
            // Same day booking
            durationMinutes = endMinutes - startMinutes;
          } else {
            // Overnight booking (departure is next day)
            durationMinutes = (24 * 60) - startMinutes + endMinutes;
          }
          
          const durationHours = durationMinutes / 60;
          
          // Calculate price per table if table configurations exist
          if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
            serviceBooking.tableConfigurations.forEach(config => {
              const guestPrice = calculateGuestPrice(service, config.guest_count);
              if (guestPrice !== null) {
                totalPrice += guestPrice * durationHours;
              }
            });
          } else {
            // Fallback to old guest pricing logic
            const guestPrice = calculateGuestPrice(service, formData.guests);
            if (guestPrice !== null) {
              totalPrice += guestPrice * durationHours;
            }
          }
        }
      }
    });
    return totalPrice;
  };

  // Calculate discounted total price
  const calculateDiscountedTotalPrice = () => {
    if (services.length === 0) {
      // For basic venue booking, no special discounts apply
      return calculateOriginalTotalPrice();
    }

    // For service bookings, use the final price from discount calculation if available
    let totalPrice = 0;
    formData.serviceBookings.forEach(serviceBooking => {
      // Use the pre-calculated final price if available (from discount calculation)
      if (serviceBooking.finalPrice !== undefined) {
        totalPrice += serviceBooking.finalPrice;
      } else {
        // Fallback to original price if no discount calculation available
        totalPrice += serviceBooking.originalPrice || 0;
      }
    });
    return totalPrice;
  };

  // Calculate total savings
  const calculateTotalSavings = () => {
    if (services.length === 0) return 0;
    
    return formData.serviceBookings.reduce((total, booking) => {
      return total + (booking.savings || 0);
    }, 0);
  };
  
  const originalTotalPrice = calculateOriginalTotalPrice();
  const discountedTotalPrice = calculateDiscountedTotalPrice();
  const totalSavings = calculateTotalSavings();
  
  // Use discounted price as the final total
  const totalPrice = discountedTotalPrice;

  // Helper to check if a given date is closed per working hours
  const isClosedDay = (date: Date | undefined) => {
    if (!date || !workingHours) return false;
    const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
    const key = dayKeys[date.getDay()];
    const schedule: any = (workingHours as any)[key];
    return !!(schedule && schedule.closed);
  };

  // Check if venue is currently closed (gray status) - not bookable due to time constraints
  const isVenueCurrentlyClosed = () => {
    if (!workingHours) return false;
    return !isVenueBookableNow(workingHours);
  };

  // Simulate haptic feedback for mobile devices
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Enhanced auto-focus with progressive field guidance and animations
  const handleSubmitWithValidation = async () => {
    // Check required fields and automatically interact with the first missing one
    if (!formData.date) {
      triggerHapticFeedback('medium');
      
      // Scroll to date picker and automatically open it
      const dateElement = document.querySelector('[data-testid="date-picker"]') as HTMLButtonElement;
      if (dateElement) {
        dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add immediate visual feedback with shake
        dateElement.classList.add('ring-4', 'ring-red-300', 'ring-opacity-75', 'animate-bounce', 'scale-105');
        dateElement.style.animation = 'shake 0.6s ease-in-out, glow 2s ease-in-out infinite alternate';
        
        setTimeout(() => {
          // Focus and automatically click to open date picker
          dateElement.focus();
          
          // Simulate click to open the date picker
          dateElement.click();
          setIsDateOpen(true);
          
          setTimeout(() => {
            dateElement.classList.remove('ring-4', 'ring-red-300', 'ring-opacity-75', 'animate-bounce', 'scale-105');
            dateElement.style.animation = '';
          }, 3000);
        }, 600);
      }
      
      toast({
        title: t('notifications.bookingAnnouncements.selectDate.title'),
        description: t('notifications.bookingAnnouncements.selectDate.description'),
        variant: "destructive",
      });
      return;
    }

    // Prevent booking on closed days
    if (isClosedDay(formData.date)) {
      toast({
        title: t('notifications.bookingAnnouncements.venueClosed.title'),
        description: t('notifications.bookingAnnouncements.venueClosed.description'),
        variant: "destructive",
      });
      return;
    }

    // Check service selection for venues with services
    if (services.length > 0 && formData.serviceIds.length === 0) {
      triggerHapticFeedback('medium');
      
      // Scroll to services section
      const servicesElement = document.querySelector('[data-section="services"]') ||
                             document.querySelector('.space-y-4:has(.cursor-pointer)');
      if (servicesElement) {
        servicesElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Add pulsing effect to service cards
        const serviceCards = servicesElement.querySelectorAll('.cursor-pointer');
        serviceCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('animate-pulse', 'ring-2', 'ring-blue-200', 'bg-blue-50/50');
            setTimeout(() => {
              card.classList.remove('animate-pulse', 'ring-2', 'ring-blue-200', 'bg-blue-50/50');
            }, 3000);
          }, index * 200); // Stagger the animations
        });
      }
      
      toast({
        title: t('notifications.bookingAnnouncements.chooseServices.title'),
        description: t('notifications.bookingAnnouncements.chooseServices.description'),
        variant: "destructive",
      });
      return;
    }

    // Check times for basic venue booking
    if (services.length === 0) {
      if (!formData.arrivalTime || !formData.departureTime) {
        triggerHapticFeedback('medium');
        
        // Determine which time field to focus on
        const missingField = !formData.arrivalTime ? 'arrival' : 'departure';
        
        // Find and interact with the specific time select
        const timesSection = document.querySelector('[data-section="times"]');
        const targetSelect = document.querySelector(`[data-time-field="${missingField}"]`) as HTMLElement;
        
        if (timesSection && targetSelect) {
          timesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the entire times section first
          timesSection.classList.add('ring-4', 'ring-orange-200', 'bg-orange-50/50', 'rounded-xl', 'p-2');
          timesSection.style.animation = 'shake 0.5s ease-in-out';
          
          setTimeout(() => {
            // Focus on specific select and try to open it
            targetSelect.focus();
            
            // For select elements, try to trigger the dropdown
            const selectTrigger = targetSelect.querySelector('[data-radix-collection-item]') || 
                                 targetSelect.querySelector('button') ||
                                 targetSelect;
            
            if (selectTrigger) {
              (selectTrigger as HTMLElement).click();
              
              // Add pulsing effect to the specific field with shake
              targetSelect.classList.add('ring-4', 'ring-blue-400', 'animate-pulse', 'scale-105');
              targetSelect.style.animation = 'shake 0.4s ease-in-out, glow 1.5s ease-in-out infinite alternate';
              
              setTimeout(() => {
                targetSelect.classList.remove('ring-4', 'ring-blue-400', 'animate-pulse', 'scale-105');
                targetSelect.style.animation = '';
                timesSection.classList.remove('ring-4', 'ring-orange-200', 'bg-orange-50/50', 'rounded-xl', 'p-2');
                timesSection.style.animation = '';
              }, 3500);
            }
          }, 800);
        }
        
        toast({
          title: t('notifications.bookingAnnouncements.setTimes.title'),
          description: t('notifications.bookingAnnouncements.setTimes.description', { field: missingField === 'arrival' ? 'Arrival' : 'Departure' }),
          variant: "destructive",
        });
        return;
      }
    }

    // Check service times completion
    if (services.length > 0) {
      const incompleteServices = formData.serviceIds.filter(serviceId => {
        const booking = formData.serviceBookings.find(sb => sb.serviceId === serviceId);
        return !booking || !booking.arrivalTime || !booking.departureTime;
      });

      if (incompleteServices.length > 0) {
        triggerHapticFeedback('medium');
        
        // Find the first incomplete service and automatically open its dialog
        const firstIncompleteServiceId = incompleteServices[0];
        const serviceElement = document.querySelector(`[data-service-id="${firstIncompleteServiceId}"]`) as HTMLElement;
        const incompleteService = services.find(s => s.id === firstIncompleteServiceId);
        
        if (serviceElement && incompleteService) {
          serviceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Create an attention-grabbing sequence with shake
          serviceElement.classList.add('ring-4', 'ring-yellow-300', 'bg-yellow-50', 'scale-105', 'shadow-lg');
          serviceElement.style.animation = 'shake 0.8s ease-in-out, pulse 1.5s ease-in-out infinite';
          
          setTimeout(() => {
            // Automatically open the service dialog
            setDialogService(incompleteService);
            setIsDialogOpen(true);
            
            // Clean up the visual effects after opening dialog
            setTimeout(() => {
              serviceElement.classList.remove('ring-4', 'ring-yellow-300', 'bg-yellow-50', 'scale-105', 'shadow-lg');
              serviceElement.style.animation = '';
            }, 1000);
          }, 1200);
        }
        
        toast({
          title: t('notifications.bookingAnnouncements.completeServiceTimes.title'),
          description: t('notifications.bookingAnnouncements.completeServiceTimes.description', { serviceName: incompleteService?.services?.name || 'service' }),
          variant: "destructive",
        });
        return;
      }
    }

    // Check special requests character limit
    if (formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH) {
      triggerHapticFeedback('medium');
      
      // Scroll to special requests field
      const requestsElement = document.querySelector('#requests') as HTMLElement;
      if (requestsElement) {
        requestsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add visual feedback with shake and red border
        requestsElement.classList.add('ring-4', 'ring-red-400', 'animate-pulse', 'scale-105');
        requestsElement.style.animation = 'shake 0.6s ease-in-out';
        
        setTimeout(() => {
          requestsElement.focus();
          setTimeout(() => {
            requestsElement.classList.remove('ring-4', 'ring-red-400', 'animate-pulse', 'scale-105');
            requestsElement.style.animation = '';
          }, 3000);
        }, 600);
      }
      
      toast({
        title: t('notifications.bookingAnnouncements.specialRequestsTooLong.title'),
        description: t('notifications.bookingAnnouncements.specialRequestsTooLong.description', { maxLength: SPECIAL_REQUESTS_MAX_LENGTH }),
        variant: "destructive",
      });
      return;
    }

    // If all validations pass, proceed with booking
    triggerHapticFeedback('light'); // Success feedback
    await handleSubmit(new Event('submit') as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.date) {
      toast({
        title: t('notifications.bookingAnnouncements.missingDate.title'),
        description: t('notifications.bookingAnnouncements.missingDate.description'),
        variant: "destructive",
      });
      return;
    }

    // Prevent booking on closed days
    if (isClosedDay(formData.date)) {
      toast({
        title: t('notifications.bookingAnnouncements.closed.title'),
        description: t('notifications.bookingAnnouncements.closed.description'),
        variant: "destructive",
      });
      return;
    }

    // For service bookings, ensure date is selected
    if (services.length > 0 && !formData.date) {
      toast({
        title: t('notifications.bookingAnnouncements.missingDateForServices.title'),
        description: t('notifications.bookingAnnouncements.missingDateForServices.description'),
        variant: "destructive",
      });
      return;
    }

    // Validate times based on booking type
    if (services.length === 0) {
      // For basic venue booking
      if (!formData.arrivalTime || !formData.departureTime) {
        toast({
          title: t('notifications.bookingAnnouncements.missingTimes.title'),
          description: t('notifications.bookingAnnouncements.missingTimes.description'),
          variant: "destructive",
        });
        return;
      }

      // Validate main booking times against venue closing time
      const validation = validateBookingTimeRange(
        formData.arrivalTime,
        formData.departureTime,
        workingHours,
        formData.date,
        openingTime,
        closingTime
      );

      if (!validation.isValid) {
        toast({
          title: t('notifications.bookingAnnouncements.invalidBookingTime.title'),
          description: t('notifications.bookingAnnouncements.invalidBookingTime.description', { errorMessage: validation.errorMessage }),
          variant: "destructive",
        });
        return;
      }
    } else {
      // For service bookings
      if (formData.serviceIds.length === 0) {
        toast({
          title: t('notifications.bookingAnnouncements.noServicesSelected.title'),
          description: t('notifications.bookingAnnouncements.noServicesSelected.description'),
          variant: "destructive",
        });
        return;
      }

      // Check that all selected services have complete time bookings
      const incompleteServices = formData.serviceIds.filter(serviceId => {
        const booking = formData.serviceBookings.find(sb => sb.serviceId === serviceId);
        return !booking || !booking.arrivalTime || !booking.departureTime;
      });

      if (incompleteServices.length > 0) {
        toast({
          title: t('notifications.bookingAnnouncements.incompleteServiceTimes.title'),
          description: t('notifications.bookingAnnouncements.incompleteServiceTimes.description'),
          variant: "destructive",
        });
        return;
      }

      // Validate all service booking times against venue closing time
      for (const serviceBooking of formData.serviceBookings) {
        const validation = validateBookingTimeRange(
          serviceBooking.arrivalTime,
          serviceBooking.departureTime,
          workingHours,
          formData.date,
          openingTime,
          closingTime
        );

        if (!validation.isValid) {
          toast({
            title: t('notifications.bookingAnnouncements.invalidServiceBookingTime.title'),
            description: t('notifications.bookingAnnouncements.invalidServiceBookingTime.description', { errorMessage: validation.errorMessage }),
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    // For service bookings, use the first service booking times as main times
    let mainArrivalTime = formData.arrivalTime;
    let mainDepartureTime = formData.departureTime;
    
    if (services.length > 0 && formData.serviceBookings.length > 0) {
      const firstServiceBooking = formData.serviceBookings[0];
      mainArrivalTime = firstServiceBooking.arrivalTime;
      mainDepartureTime = firstServiceBooking.departureTime;
    }
    
    const bookingData = {
      venueId,
      venueName,
      date: formData.date ? format(formData.date, 'yyyy-MM-dd') : "",
      arrivalTime: mainArrivalTime,
      departureTime: mainDepartureTime,
      serviceBookings: formData.serviceBookings,
      guests: formData.guests,
      serviceIds: formData.serviceIds,
      totalPrice: originalTotalPrice, // Original price before discounts
      discountedTotal: discountedTotalPrice, // Final price after discounts
      totalSavings: totalSavings, // Total amount saved
      specialRequests: formData.specialRequests,
    };

    // Open payment dialog instead of navigating
    setCurrentBookingData(bookingData);
    setIsPaymentDialogOpen(true);
  };

  // Generate 15-minute time slots based on venue hours
  const generateTimeSlots = () => {
    return generateTimeSlotsUtil({
      workingHours,
      selectedDate: formData.date,
      fallbackOpeningTime: openingTime || '00:00',
      fallbackClosingTime: closingTime || '23:59',
      minimumBookingMinutes: 60,
      slotIntervalMinutes: 15,
      bufferMinutes: 2
    });
  };

  // Handle main arrival/departure time updates
  const updateMainTime = (field: 'arrivalTime' | 'departureTime', value: string) => {
    const arrivalTime = field === 'arrivalTime' ? value : formData.arrivalTime;
    const departureTime = field === 'departureTime' ? value : formData.departureTime;

    // Validate not in past for today's bookings
    if (formData.date && field === 'arrivalTime') {
      const pastValidation = validateNotInPast(value, formData.date, 2);
      if (!pastValidation.isValid) {
        toast({
          title: t('notifications.bookingAnnouncements.invalidTime.title'),
          description: t('notifications.bookingAnnouncements.invalidTime.description', { errorMessage: pastValidation.errorMessage }),
          variant: "destructive",
        });
        return;
      }
    }

    // Use centralized validation system
    if (value && formData.date) {
      const validation = validateBookingTimes(arrivalTime, departureTime, {
        workingHours,
        selectedDate: formData.date,
        fallbackOpeningTime: openingTime,
        fallbackClosingTime: closingTime,
        minimumBookingMinutes: 60
      });

      if (!validation.isValid) {
        toast({
          title: t('notifications.bookingAnnouncements.invalidTime.title'),
          description: t('notifications.bookingAnnouncements.invalidTime.description', { errorMessage: validation.errorMessage }),
          variant: "destructive",
        });
        return;
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle service time updates with validation
  const updateServiceTime = (serviceId: string, field: 'arrivalTime' | 'departureTime', value: string) => {
    // Validate not in past for today's bookings
    if (formData.date && field === 'arrivalTime') {
      const pastValidation = validateNotInPast(value, formData.date, 2);
      if (!pastValidation.isValid) {
        toast({
          title: t('notifications.bookingAnnouncements.invalidTime.title'),
          description: t('notifications.bookingAnnouncements.invalidTime.description', { errorMessage: pastValidation.errorMessage }),
          variant: "destructive",
        });
        return;
      }
    }

    // Get current service booking to validate with existing times
    const existingBooking = formData.serviceBookings.find(sb => sb.serviceId === serviceId);
    const arrivalTime = field === 'arrivalTime' ? value : existingBooking?.arrivalTime || '';
    const departureTime = field === 'departureTime' ? value : existingBooking?.departureTime || '';

    // Use centralized validation system
    if (value && formData.date) {
      const validation = validateBookingTimes(arrivalTime, departureTime, {
        workingHours,
        selectedDate: formData.date,
        fallbackOpeningTime: openingTime,
        fallbackClosingTime: closingTime,
        minimumBookingMinutes: 60
      });

      if (!validation.isValid) {
        toast({
          title: t('notifications.bookingAnnouncements.invalidTime.title'),
          description: t('notifications.bookingAnnouncements.invalidTime.description', { errorMessage: validation.errorMessage }),
          variant: "destructive",
        });
        return;
      }
    }

    setFormData(prev => {
      const existingBooking = prev.serviceBookings.find(sb => sb.serviceId === serviceId);
      if (existingBooking) {
        const updatedBooking = { ...existingBooking, [field]: value };
        
        // Validate booking time range including closing time
        if (updatedBooking.arrivalTime && updatedBooking.departureTime && formData.date) {
          const validation = validateBookingTimeRange(
            updatedBooking.arrivalTime,
            updatedBooking.departureTime,
            workingHours,
            formData.date,
            openingTime,
            closingTime
          );

          if (!validation.isValid) {
            toast({
              title: "Invalid time",
              description: validation.errorMessage,
              variant: "destructive",
            });
            return prev;
          }
        }

        return {
          ...prev,
          serviceBookings: prev.serviceBookings.map(sb =>
            sb.serviceId === serviceId ? updatedBooking : sb
          )
        };
      } else {
        return {
          ...prev,
          serviceBookings: [
            ...prev.serviceBookings,
            {
              serviceId,
              arrivalTime: field === 'arrivalTime' ? value : '',
              departureTime: field === 'departureTime' ? value : '',
            }
          ]
        };
      }
    });
  };

  // Helper function to format time for display (24-hour format)
  const formatTime = (time: string) => {
    // Use 24-hour format
    return time;
  };

  const getTotalTables = (serviceBooking: any) => {
    if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
      return serviceBooking.tableConfigurations.length;
    }
    return serviceBooking.numberOfTables || 1;
  };

  const handleServiceSelect = (service: VenueService) => {
    console.log('BookingForm - Service selected:', service.name, { isDialogOpen, dialogService: dialogService?.name });
    
    if (!formData.date) {
      toast({
        title: t('notifications.bookingAnnouncements.selectDateFirst.title'),
        description: t('notifications.bookingAnnouncements.selectDateFirst.description'),
        variant: "destructive",
      });
      return;
    }
    if (isClosedDay(formData.date)) {
      toast({
        title: t('notifications.bookingAnnouncements.closed.title'),
        description: t('notifications.bookingAnnouncements.closed.description'),
        variant: "destructive",
      });
      return;
    }
    
    console.log('BookingForm - Opening service dialog for:', service.name);
    setDialogService(service);
    setIsDialogOpen(true);
    
    // Debug: Check dialog state after setting
    setTimeout(() => {
      console.log('BookingForm - Dialog state after opening:', { isDialogOpen, dialogService: dialogService?.name });
    }, 100);
  };

  const handleRemoveService = (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering service select
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.filter(id => id !== serviceId),
      serviceBookings: prev.serviceBookings.filter(sb => sb.serviceId !== serviceId)
    }));
  };

  const handleServiceConfirm = (data: {
    service: VenueService;
    numberOfTables: number;
    tableConfigurations: Array<{
      table_number: number;
      guest_count: number;
    }>;
    arrivalTime: string;
    departureTime: string;
    selectedGames: string[];
    originalPrice: number;
    finalPrice: number;
    savings: number;
    appliedDiscounts: string[];
    discountBreakdown: any;
  }) => {
    // Calculate total guests across all tables for this service
    const totalGuestsForService = data.tableConfigurations.reduce((sum, config) => sum + config.guest_count, 0);
    
    setFormData(prev => {
      const existingBookingIndex = prev.serviceBookings.findIndex(sb => sb.serviceId === data.service.id);
      const updatedBooking = {
        serviceId: data.service.id,
        arrivalTime: data.arrivalTime,
        departureTime: data.departureTime,
        numberOfTables: data.numberOfTables,
        tableConfigurations: data.tableConfigurations,
        selectedGames: data.selectedGames,
        originalPrice: data.originalPrice,
        finalPrice: data.finalPrice,
        savings: data.savings,
        appliedDiscounts: data.appliedDiscounts,
        discountBreakdown: data.discountBreakdown
      };

      const newServiceBookings = [...prev.serviceBookings];
      if (existingBookingIndex >= 0) {
        newServiceBookings[existingBookingIndex] = updatedBooking;
      } else {
        newServiceBookings.push(updatedBooking);
      }

      const serviceIds = prev.serviceIds.includes(data.service.id)
        ? prev.serviceIds
        : [...prev.serviceIds, data.service.id];

      return {
        ...prev,
        serviceIds,
        guests: totalGuestsForService,
        serviceBookings: newServiceBookings
      };
    });

    // Advance guide after successful confirmation
    bookingFlow.markStepComplete('service');
  };

  return (
    <div className="relative">
      {/* Custom animations for field focusing */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
          100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6); }
        }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        .shake-animation {
          animation: shake 0.6s ease-in-out;
        }
        
        .glow-animation {
          animation: glow 2s ease-in-out infinite alternate;
        }
        
        .breathe-animation {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="px-0 space-y-8 pb-8 lg:pb-24">
          <form onSubmit={handleSubmit} className="space-y-8">
            

            
            {/* Date Selection - Now venue-specific and appears above services */}
            <div className="space-y-4">
              {/* Venue Closed Warning */}
              {isVenueCurrentlyClosed() && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">{t('common.venueClosed')}</span>
                  </div>
                  <p className="text-sm text-red-600">
                    {t('common.venueClosedDescription')}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium">{t('venue.selectDate')}</h3>
              </div>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="date-picker"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50",
                      "transition-all duration-200 hover:shadow-md",
                      !formData.date && "text-muted-foreground",
                      formData.date && "border-blue-200 bg-blue-50/30 text-blue-900",
                      isVenueCurrentlyClosed() && "opacity-50 cursor-not-allowed",
                      bookingFlow.getGlowClass('date'),
                      "dark:text-white dark:hover:text-white dark:focus:text-white"
                    )}
                    disabled={isVenueCurrentlyClosed()}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 dark:text-white" />
                    {isVenueCurrentlyClosed() ? t('common.venueClosedNoBookings') : (formData.date ? formatDateWithLocale(formData.date, "MMMM d, yyyy") : t('venue.pickDate'))}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999] relative" align="start" side="bottom" sideOffset={10}>
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      console.log('Calendar onSelect called with:', date);
                      setFormData(prev => ({ ...prev, date }));
                      if (date) {
                        setIsDateOpen(false);
                      }
                    }}
                    disabled={(date) => {
                      const now = new Date();
                      const todayStart = new Date(now);
                      todayStart.setHours(0, 0, 0, 0);
                      // Past dates disabled
                      if (date < todayStart) return true;

                      // Check max booking days in advance limit
                      if (maxBookingDaysInAdvance && maxBookingDaysInAdvance > 0) {
                        const maxDate = new Date(todayStart);
                        maxDate.setDate(maxDate.getDate() + maxBookingDaysInAdvance);
                        if (date >= maxDate) return true;
                      }

                      // Closed days disabled when workingHours provided
                      if (workingHours) {
                        const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
                        const key = dayKeys[date.getDay()];
                        const schedule: any = (workingHours as any)[key];
                        if (schedule && schedule.closed) return true;
                      }
                      return false;
                    }}
                    initialFocus
                    className={cn(
                      "p-3 pointer-events-auto calendar-enhanced",
                      "bg-background rounded-xl shadow-2xl border border-border",
                      "ring-1 ring-ring/50 backdrop-blur-sm z-50",
                      "relative top-0 left-0"
                    )}
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-lg font-semibold text-foreground",
                      nav: "space-x-1 flex items-center",
                      nav_button: cn(
                        "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                        "hover:bg-accent rounded-lg transition-all duration-200"
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: cn(
                        "text-muted-foreground rounded-md w-9 font-medium text-sm",
                        "py-2 px-1 text-center"
                      ),
                      row: "flex w-full mt-2",
                      cell: cn(
                        "h-9 w-9 text-center text-sm p-0 relative",
                        "focus-within:relative focus-within:z-20"
                      ),
                      day: cn(
                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                        "hover:bg-accent rounded-lg transition-all duration-200",
                        "focus:bg-accent focus:rounded-lg focus:outline-none"
                      ),
                      day_selected: cn(
                        "bg-white text-gray-900 border-2 border-primary",
                        "hover:bg-gray-100 hover:text-gray-900",
                        "focus:bg-gray-100 focus:text-gray-900",
                        "shadow-lg transform scale-105 transition-all duration-200",
                        "dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                      ),
                      day_today: cn(
                        "bg-gradient-to-r from-muted to-muted/80 text-foreground",
                        "font-semibold ring-2 ring-primary"
                      ),
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Main Booking Times - Only show if no services */}
            {services.length === 0 && (
              <div className="space-y-4" data-section="times">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium">Session Times</h3>
                  {openingTime && closingTime && (
                    <p className="text-sm text-muted-foreground">
                      Open: {formatTime(openingTime)} - {formatTime(closingTime)}
                    </p>
                  )}
                </div>
                
                                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2" data-time-field="arrival">
                    <Label htmlFor="main-arrival">Arrival Time *</Label>
                    <Select 
                      value={formData.arrivalTime} 
                      onValueChange={(value) => updateMainTime('arrivalTime', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select arrival time" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const timeSlots = generateTimeSlots();
                          if (timeSlots.length === 0) {
                            return (
                              <div className="p-4 text-center text-muted-foreground">
                                <p className="text-sm font-medium">No available times</p>
                                <p className="text-xs mt-1">
                                  {formData.date && new Date().toDateString() === formData.date.toDateString() 
                                    ? "No more arrival times available for today"
                                    : "No arrival times available for this date"
                                  }
                                </p>
                              </div>
                            );
                          }
                          return timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime(time)}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2" data-time-field="departure">
                    <Label htmlFor="main-departure">Departure Time *</Label>
                    <Select 
                      value={formData.departureTime} 
                      onValueChange={(value) => updateMainTime('departureTime', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select departure time" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const timeSlots = generateTimeSlots();
                          if (timeSlots.length === 0) {
                            return (
                              <div className="p-4 text-center text-muted-foreground">
                                <p className="text-sm font-medium">No available times</p>
                                <p className="text-xs mt-1">
                                  {formData.date && new Date().toDateString() === formData.date.toDateString() 
                                    ? "No more departure times available for today"
                                    : "No departure times available for this date"
                                  }
                                </p>
                              </div>
                            );
                          }
                          return timeSlots.map((time) => {
                            const isDisabled = formData.arrivalTime && time <= formData.arrivalTime;
                            return (
                              <SelectItem 
                                key={time} 
                                value={time}
                                disabled={isDisabled}
                                className={isDisabled ? "text-muted-foreground/50 cursor-not-allowed" : ""}
                              >
                                {formatTime(time)}
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Services Selection */}
            {services.length > 0 && (
              <div className="space-y-4" data-section="services">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-foreground">
                    {t('notifications.bookingAnnouncements.chooseServices.title', 'Choose Service')}
                  </h3>
                </div>
                {services.map((service) => {
                  const isSelected = formData.serviceIds.includes(service.id);
                  const serviceBooking = formData.serviceBookings.find(sb => sb.serviceId === service.id);
                  
                  return (
                    <div 
                      key={service.id}
                      data-service-id={service.id}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all relative",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : !formData.date || isVenueCurrentlyClosed()
                          ? "border-border dark:border-white/10 opacity-50 cursor-not-allowed"
                          : "border-border dark:border-white/20 hover:border-primary/50 dark:hover:border-primary/60",
                        // Add glow effect for service selection step
                        formData.date && !isSelected && bookingFlow.currentStep === 'service' && bookingFlow.getGlowClass('service')
                      )}
                      onClick={() => {
                        if (formData.date && !isVenueCurrentlyClosed()) {
                          handleServiceSelect(service);
                          // Do not advance the guide yet; only advance on confirm
                        }
                      }}
                    >
                      {/* Remove button for selected services */}
                      {isSelected && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleRemoveService(service.id, e)}
                                className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Discard Service</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Date required indicator */}
                      {!formData.date && !isSelected && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <div className="text-center p-4">
                            <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{t('venue.selectDateFirst')}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        <ServiceImageDisplay 
                          serviceId={service.service_id} 
                          serviceName={service.services?.name || 'Service'} 
                        />
                         <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-base sm:text-lg">
                                {translateService({
                                  name: service.services?.name || 'Unknown Service',
                                  name_en: service.services?.name_en,
                                  name_ka: service.services?.name_ka
                                })}
                              </h4>
                              <ServiceDiscountIndicator service={service} venueDiscounts={venueDiscounts} />
                            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
               {getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'))}
            </p>
           </div>
          </div>
          
          {/* Selected booking information */}
          {isSelected && serviceBooking && formData.date && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {!isPerTableService(service.pricing_model) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getGuestLabel(service, t('pricing.guest'), i18n.language as 'en' | 'ka')}s:</span>
                  <span className="font-medium">
                    {serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0
                      ? serviceBooking.tableConfigurations.reduce((sum, c) => sum + c.guest_count, 0)
                      : formData.guests}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{getTableLabel(service, t('pricing.table'), i18n.language as 'en' | 'ka')}s:</span>
                <span className="font-medium">{getTotalTables(serviceBooking)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(formData.date, "MMM dd, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">
                  {formatTime(serviceBooking.arrivalTime)} - {formatTime(serviceBooking.departureTime)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground font-medium">Total:</span>
                <span className="font-bold text-primary">
                  {/* Use the final price if available, otherwise calculate */}
                  {serviceBooking.finalPrice !== undefined 
                    ? `${serviceBooking.finalPrice.toFixed(2)} ${t('booking.currency')}` 
                    : (() => {
                        if (!serviceBooking.arrivalTime || !serviceBooking.departureTime) return `0 ${t('booking.currency')}`;
                        
                        // Parse time components to avoid timezone issues
                        const [startHour, startMinute] = serviceBooking.arrivalTime.split(':').map(Number);
                        const [endHour, endMinute] = serviceBooking.departureTime.split(':').map(Number);
                        
                        // Convert to minutes since midnight
                        const startMinutes = startHour * 60 + startMinute;
                        const endMinutes = endHour * 60 + endMinute;
                        
                        // Calculate duration in minutes
                        let durationMinutes: number;
                        if (endMinutes >= startMinutes) {
                          // Same day booking
                          durationMinutes = endMinutes - startMinutes;
                        } else {
                          // Overnight booking (departure is next day)
                          durationMinutes = (24 * 60) - startMinutes + endMinutes;
                        }
                        
                        const hours = durationMinutes / 60;
                        if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
                          const subtotal = serviceBooking.tableConfigurations.reduce((sum, config) => {
                            const guestPrice = calculateGuestPrice(service, config.guest_count);
                            return sum + (guestPrice ? guestPrice * hours : 0);
                          }, 0);
                          return `${subtotal.toFixed(2)} ${t('booking.currency')}`;
                        } else {
                          // For per-table services without table configs, default to one table
                          const guestPrice = calculateGuestPrice(service, 1);
                          return guestPrice ? `${(guestPrice * hours).toFixed(2)} ${t('booking.currency')}` : `0 ${t('booking.currency')}`;
                        }
                      })()
                  }
                </span>
              </div>
              {/* Show discount information if available */}
              {(serviceBooking.savings ?? 0) > 0 && (
                <div className="text-xs text-green-600 pt-1">
                  {serviceBooking.originalPrice && (
                    <span className="line-through text-muted-foreground mr-2">
                      {serviceBooking.originalPrice.toFixed(2)} {t('booking.currency')}
                    </span>
                  )}
                  <span>Save {serviceBooking.savings.toFixed(2)} {t('booking.currency')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>
)}

            {/* Service Booking Dialog */}
            <ServiceBookingDialog
              service={dialogService}
              venueId={venueId}
              isOpen={isDialogOpen}
              onClose={() => {
                console.log('BookingForm - Service dialog closing:', { dialogService: dialogService?.name });
                setIsDialogOpen(false);
                setDialogService(null);
              }}
              onConfirm={handleServiceConfirm}
              openingTime={openingTime}
              closingTime={closingTime}
              workingHours={workingHours}
              venueDate={formData.date}
              initialData={
                dialogService && formData.serviceIds.includes(dialogService.id)
                  ? (() => {
                      const sb = formData.serviceBookings.find(sb => sb.serviceId === dialogService.id);
                      return {
                        guests: sb?.tableConfigurations && sb.tableConfigurations.length > 0
                          ? sb.tableConfigurations.reduce((sum, c) => sum + c.guest_count, 0)
                          : formData.guests,
                        arrivalTime: sb?.arrivalTime || "",
                        departureTime: sb?.departureTime || "",
                        numberOfTables: sb?.numberOfTables,
                        tableConfigurations: sb?.tableConfigurations,
                        selectedGames: sb?.selectedGames,
                      };
                    })()
                  : undefined
              }
            />


            {/* Special Requests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="requests" className="text-base sm:text-lg font-medium">
                  {t('venue.specialRequests')}
                </Label>
                <span className={cn(
                  "text-xs font-medium",
                  formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH 
                    ? "text-destructive" 
                    : formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH * 0.8 
                    ? "text-orange-600" 
                    : "text-muted-foreground"
                )}>
                  {formData.specialRequests.length}/{SPECIAL_REQUESTS_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="requests"
                value={formData.specialRequests}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= SPECIAL_REQUESTS_MAX_LENGTH) {
                    setFormData(prev => ({ ...prev, specialRequests: value }));
                  }
                }}
                placeholder={t('venue.specialRequestsPlaceholder')}
                className={cn(
                  "resize-none min-h-[100px] transition-colors",
                  formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH 
                    ? "border-destructive focus-visible:ring-destructive" 
                    : formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH * 0.8 
                    ? "border-orange-300 focus-visible:ring-orange-300" 
                    : ""
                )}
                rows={4}
              />
              {formData.specialRequests.length > SPECIAL_REQUESTS_MAX_LENGTH && (
                <p className="text-xs text-destructive">
                  {t('venue.specialRequestsTooLong', 'Comment cannot exceed 500 characters')}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Mobile Sticky Reserve Section */}
      <div className="lg:hidden sticky bottom-0 left-0 right-0 mt-6 z-30">
        <div
          className="backdrop-blur-sm border-t border-border shadow-xl mx-4 mb-4 rounded-2xl overflow-hidden dark:border-gray-700 [background-color:rgba(255,255,255,0.95)] dark:[background-color:rgba(17,24,39,0.95)]"
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-4">
              {/* Price Section - Improved Layout */}
              <div className="flex-1 min-w-0 pr-2">
                {totalSavings > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                    Save {totalSavings.toFixed(2)} {t('booking.currency')}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    {totalSavings > 0 && (
                      <span className="text-sm text-muted-foreground dark:text-gray-400 line-through">
                        {originalTotalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xl sm:text-2xl font-bold text-primary dark:text-white">
                      {totalPrice.toFixed(2)}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-primary dark:text-white">
                      {t('booking.currency')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reserve Button - Compact and Responsive */}
              <div className="flex-shrink-0">
                <Button 
                  onClick={handleSubmitWithValidation}
                  size="lg"
                  className={cn(
                    "h-12 px-4 sm:px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group whitespace-nowrap",
                    // Visual appearance based on form completion but always clickable
                    (() => {
                      const isFormComplete = formData.date && 
                        ((services.length === 0 && formData.arrivalTime && formData.departureTime) ||
                         (services.length > 0 && formData.serviceIds.length > 0 && 
                          formData.serviceBookings.length > 0 && 
                          formData.serviceBookings.every(sb => sb.arrivalTime && sb.departureTime)));
                      
                      if (isFormComplete) {
                        return "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90";
                      } else {
                        // Appears disabled but stays clickable
                        return "bg-gradient-to-r from-primary to-blue-600 opacity-60 hover:opacity-70 cursor-pointer";
                      }
                    })()
                  )}
                  disabled={isSubmitting || isVenueCurrentlyClosed()}
                >
                  {/* Button shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <div className="relative flex items-center gap-1 sm:gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-sm">{t('booking.creating')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm sm:text-base">{t('booking.reserve')}</span>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Reserve Section */}
      <div className="hidden lg:block absolute bottom-0 right-0">
        <div className="max-w-sm">
          <div className="flex items-center gap-4">
             <div className="flex-1">
               <span className="text-4xl font-bold text-primary bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{totalPrice.toFixed(2)} {t('booking.currency')}</span>
             </div>
            <Button 
              onClick={handleSubmit}
              className="h-16 px-10 text-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
              disabled={
                isSubmitting || 
                isVenueCurrentlyClosed() ||
                !formData.date || 
                isClosedDay(formData.date) ||
                originalTotalPrice <= 0 ||
                (services.length > 0 && formData.serviceIds.length === 0) ||
                (services.length === 0 && (!formData.arrivalTime || !formData.departureTime)) ||
                (formData.serviceIds.length > 0 && formData.serviceBookings.some(sb => !sb.arrivalTime || !sb.departureTime))
              }
            >
              {isSubmitting ? t('booking.creating') : t('booking.reserve')}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog - Only render when open */}
      {isPaymentDialogOpen && (
        <BookingPaymentDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          bookingData={currentBookingData}
          onSuccess={(data) => {
            toast({
              title: t('notifications.bookingAnnouncements.bookingSuccessful.title'),
              description: t('notifications.bookingAnnouncements.bookingSuccessful.description'),
            });
            setIsPaymentDialogOpen(false);
            try { localStorage.removeItem(draftStorageKey); } catch {}
            
            // Call the onBookingSuccess callback if provided (for venue card dialogs)
            if (onBookingSuccess) {
              onBookingSuccess();
            } else {
              // Redirect to home page to show current booking (for venue page)
              navigate('/');
            }
          }}
          onError={(error) => {
            toast({
              title: t('notifications.bookingAnnouncements.bookingFailed.title'),
              description: t('notifications.bookingAnnouncements.bookingFailed.description', { error }),
              variant: "destructive",
            });
          }}
        />
      )}
    </div>
  );
};

export default BookingForm;
