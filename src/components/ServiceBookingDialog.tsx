import { useState, useEffect, useRef } from "react";
import { modalHistory } from '@/lib/modalHistory';
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Minus, Plus, Users, Clock, Check, ChevronsUpDown, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { VenueService } from "@/hooks/useVenues";
import { useToast } from "@/hooks/use-toast";
import { calculateGuestPrice, isValidGuestCount, getMaxGuestCount } from "@/utils/guestPricing";
import { useServiceDiscountCalculation } from "@/hooks/useVenueDiscountCalculation";
import { isPerTableService } from "@/constants/services";
import { getTableLabel, getGuestLabel } from "@/utils/pricingLabels";
import { useBookingFlowGuide } from "@/hooks/useBookingFlowGuide";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import DiscountBadgeList from "./DiscountBadgeList";
import { 
  generateDurationOptions as generateLimitedDurationOptions, 
  validateBookingTimeRange, 
  getClosingTimeForDay,
  validateDepartureTime
} from '@/utils/bookingTimeValidation';
import { isOvernightSchedule, isTimeWithinWorkingHours } from '@/utils/workingHours';
import { generateTimeSlots as generateTimeSlotsUtil, formatWorkingHoursDisplay } from '@/utils/timeSlotGeneration';
import { validateArrivalTime, validateNotInPast } from '@/utils/timeValidation';

// Helper function to get opening time for a specific day
const getOpeningTimeForDay = (
  workingHours: any,
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

interface ServiceBookingDialogProps {
  service: VenueService | null;
  venueId?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    service: VenueService;
    numberOfTables: number;
    tableConfigurations: Array<{
      table_number: number;
      guest_count: number;
    }>;
    arrivalTime: string;
    departureTime: string;
    selectedDoctorId?: string; // For dental services

    originalPrice: number;
    finalPrice: number;
    savings: number;
    appliedDiscounts: string[];
    discountBreakdown: any;
  }) => void;
  openingTime?: string; // deprecated
  closingTime?: string; // deprecated
  workingHours?: import('@/components/DailyWorkingHours').WorkingHours;
  venueDate?: Date; // Add venue date prop
  initialData?: {
  guests: number;
  arrivalTime: string;
  departureTime: string;
  numberOfTables?: number;
  tableConfigurations?: Array<{
    table_number: number;
    guest_count: number;
  }>;

  };
}

const ServiceBookingDialog = ({
  service, 
  venueId,
  isOpen, 
  onClose, 
  onConfirm,
  openingTime,
  closingTime,
  workingHours,
  venueDate,
  initialData
}: ServiceBookingDialogProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { translateService } = useServiceTranslation();
  const registrationRef = useRef<ReturnType<typeof modalHistory.register> | null>(null);

  // Integrate with browser back button so this dialog closes on Back
  useEffect(() => {
    if (isOpen) {
      if (!registrationRef.current) {
        registrationRef.current = modalHistory.register(() => onClose());
      }
    } else {
      registrationRef.current?.unregister();
      registrationRef.current = null;
    }
  }, [isOpen, onClose]);

  // REMOVED: All body manipulation - let Radix UI handle it naturally
  const [numberOfTables, setNumberOfTables] = useState(1);
  const [tableConfigurations, setTableConfigurations] = useState<Array<{
    table_number: number;
    guest_count: number;
  }>>([{ table_number: 1, guest_count: 1 }]);
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [showTableLimitMessage, setShowTableLimitMessage] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Reset table limit message when dialog is closed or table count changes
  useEffect(() => {
    if (!isOpen) {
      setShowTableLimitMessage(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setShowTableLimitMessage(false);
  }, [tableConfigurations.length]);
  
  // Booking flow guide for time selection step
  const bookingFlow = useBookingFlowGuide(
    venueDate,
    [service?.id || ''],
    [{
      serviceId: service?.id || '',
      arrivalTime,
      departureTime,
      numberOfTables,
      tableConfigurations
    }]
  );

  // Check if this is a dental service
  const isDentalService = service?.services?.main_category === 'dental';

  // Fetch available doctors for this dental service
  const { data: availableDoctors = [] } = useQuery({
    queryKey: ['service-doctors', service?.id, venueId],
    queryFn: async () => {
      if (!isDentalService || !venueId || !service?.id) {
        return [];
      }

      // Get all doctors for this specific venue service
      const { data, error } = await supabase
        .from('venue_service_doctors')
        .select('id, doctor_name, doctor_last_name, service_total_price, service_duration_minutes')
        .eq('venue_service_id', service.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching doctors:', error);
        return [];
      }

      return data || [];
    },
    enabled: isDentalService && !!venueId && !!service?.id
  });

  // Set initial values when dialog opens with existing data
  useEffect(() => {
    // console.log('🔍 ServiceBookingDialog - Service pricing model:', service?.pricing_model);
    // console.log('🔍 ServiceBookingDialog - Is per table service:', isPerTableService(service?.pricing_model));
    
    if (isOpen && initialData) {
      if (initialData.tableConfigurations && initialData.tableConfigurations.length > 0) {
        setNumberOfTables(initialData.numberOfTables || initialData.tableConfigurations.length);
        setTableConfigurations(initialData.tableConfigurations);
      } else {
        setNumberOfTables(initialData.numberOfTables || 1);
        // For table-wise services, set guest count to 1 (not used in calculation)
        const guestCount = isPerTableService(service?.pricing_model) ? 1 : initialData.guests;
        setTableConfigurations([{ table_number: 1, guest_count: guestCount }]);
      }
      setArrivalTime(initialData.arrivalTime);
      
      // Convert actual departure time back to duration for the dialog using timezone-independent math
      if (initialData.arrivalTime && initialData.departureTime) {
        // Parse time components to avoid timezone issues
        const [arrivalHour, arrivalMinute] = initialData.arrivalTime.split(':').map(Number);
        const [departureHour, departureMinute] = initialData.departureTime.split(':').map(Number);
        
        // Convert to minutes since midnight
        const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
        const departureMinutes = departureHour * 60 + departureMinute;
        
        // Calculate duration in minutes
        let durationMinutes: number;
        if (departureMinutes >= arrivalMinutes) {
          // Same day booking
          durationMinutes = departureMinutes - arrivalMinutes;
        } else {
          // Overnight booking (departure is next day)
          durationMinutes = (24 * 60) - arrivalMinutes + departureMinutes;
        }
        
        // Convert back to HH:MM format
        const durationHours = Math.floor(durationMinutes / 60);
        const remainingMinutes = durationMinutes % 60;
        const durationString = `${durationHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
        setDepartureTime(durationString);
      } else {
        setDepartureTime("");
      }

    } else if (isOpen && !initialData) {
      // Reset to defaults when opening without initial data
      setNumberOfTables(1);
      // For table-wise services, set guest count to 1 (not used in calculation)
              const guestCount = isPerTableService(service?.pricing_model) ? 1 : 1;
      setTableConfigurations([{ table_number: 1, guest_count: guestCount }]);
      setArrivalTime("");
      setDepartureTime("");

    }
  }, [isOpen, initialData, service?.pricing_model]);

  // Update table configurations when number of tables changes
  useEffect(() => {
    setTableConfigurations(prev => {
      const newConfigs = [];
      for (let i = 1; i <= numberOfTables; i++) {
        const existingConfig = prev.find(config => config.table_number === i);
        newConfigs.push({
          table_number: i,
          guest_count: existingConfig?.guest_count || 1
        });
      }
      return newConfigs;
    });
  }, [numberOfTables]);

  // Generate duration options (1 hour minimum, 30-minute increments)
  const generateDurationOptions = () => {
    // If we have arrival time and venue date, limit options based on closing time
    if (arrivalTime && venueDate) {
      const venueClosingTime = getClosingTimeForDay(workingHours, venueDate, closingTime);
      const venueOpeningTime = getOpeningTimeForDay(workingHours, venueDate, openingTime);
      if (venueClosingTime) {
        const limitedOptions = generateLimitedDurationOptions(arrivalTime, venueClosingTime, venueOpeningTime, 12);
        
        // Convert to the format expected by the component with translations
        return limitedOptions.map(option => {
          const hours = Math.floor(option.totalMinutes / 60);
          const minutes = option.totalMinutes % 60;
          
          // Use translations for duration text
          let hoursText;
          if (hours === 1) {
            hoursText = t('booking.duration.oneHour');
          } else {
            hoursText = t('booking.duration.hours', { count: hours });
          }
          
          const minutesText = minutes === 0 ? '' : ` ${t('booking.duration.minutes', { count: minutes })}`;
          const label = minutes === 0 ? hoursText : `${hoursText}${minutesText}`;
          
          return { label, value: option.value, totalMinutes: option.totalMinutes };
        });
      }
    }
    
    // Fallback to original logic if no arrival time or venue date
    const options = [];
    for (let hours = 1; hours <= 12; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        if (hours === 12 && minutes > 0) break; // Stop at 12:00
        const totalMinutes = hours * 60 + minutes;
        
        // Use translations for duration text
        let hoursText;
        if (hours === 1) {
          hoursText = t('booking.duration.oneHour');
        } else {
          hoursText = t('booking.duration.hours', { count: hours });
        }
        
        const minutesText = minutes === 0 ? '' : ` ${t('booking.duration.minutes', { count: minutes })}`;
        const label = minutes === 0 ? hoursText : `${hoursText}${minutesText}`;
        const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        options.push({ label, value, totalMinutes });
      }
    }
    return options;
  };

  // Generate 15-minute time slots based on venue hours
  const generateTimeSlots = () => {
    return generateTimeSlotsUtil({
      workingHours,
      selectedDate: venueDate,
      fallbackOpeningTime: openingTime || '00:00',
      fallbackClosingTime: closingTime || '23:59',
      minimumBookingMinutes: 60,
      slotIntervalMinutes: 15,
      bufferMinutes: 2
    });
  };

  const handleArrivalTimeChange = (value: string) => {
    // Validate not in past for today's bookings
    if (venueDate) {
      const pastValidation = validateNotInPast(value, venueDate, 2);
      if (!pastValidation.isValid) {
        toast({
          title: "Invalid time",
          description: pastValidation.errorMessage,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate against venue working hours using centralized validation
    const arrivalValidation = validateArrivalTime(value, {
      workingHours,
      selectedDate: venueDate,
      fallbackOpeningTime: openingTime,
      fallbackClosingTime: closingTime
    });

    if (!arrivalValidation.isValid) {
      toast({
        title: "Invalid time",
        description: arrivalValidation.errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Clear departure time if it's before the new arrival time
    if (departureTime && value >= departureTime) {
      setDepartureTime("");
    }
    
    setArrivalTime(value);
    
    // Mark time step as complete if both times are selected
    if (value && departureTime) {
      bookingFlow.markStepComplete('time');
    }
  };

  const handleDepartureTimeChange = (value: string) => {
    // Validate that duration is selected
    if (!value) {
      setDepartureTime("");
      return;
    }
    
    // Validate duration against venue closing time
    if (arrivalTime && venueDate) {
      const venueClosingTime = getClosingTimeForDay(workingHours, venueDate, closingTime);
      if (venueClosingTime) {
        // Calculate actual departure time
        const [durationHours, durationMinutes] = value.split(':').map(Number);
        const durationMs = (durationHours * 60 + durationMinutes) * 60 * 1000;
        
        // Parse arrival time components to avoid timezone issues
        const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
        const arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute;
        
        // Calculate departure time in minutes since midnight
        const departureTotalMinutes = arrivalTotalMinutes + (durationHours * 60 + durationMinutes);
        
        // Handle overnight bookings (next day)
        const finalMinutes = departureTotalMinutes % (24 * 60);
        const finalHour = Math.floor(finalMinutes / 60);
        const finalMinute = finalMinutes % 60;
        
        const actualDepartureTime = `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
        
        // Use overnight-aware validation
        const venueOpeningTime = getOpeningTimeForDay(workingHours, venueDate, openingTime);
        if (venueOpeningTime) {
          const validation = validateDepartureTime(arrivalTime, actualDepartureTime, venueClosingTime, venueOpeningTime);
          if (!validation.isValid) {
            toast({
              title: "Invalid duration",
              description: validation.errorMessage,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }
    
    setDepartureTime(value);
    
    // Mark time step as complete if both arrival time and duration are selected
    if (arrivalTime && value) {
      bookingFlow.markStepComplete('time');
    }
  };

  const handleConfirm = () => {
    // Validate doctor selection for dental services
    if (isDentalService && availableDoctors.length > 0 && !selectedDoctorId) {
      toast({
        title: "Doctor Selection Required",
        description: "Please select a doctor for your dental appointment.",
        variant: "destructive",
      });
      return;
    }

    // For dental services, we need both arrival time and doctor selection
    // For regular services, we need both arrival time and departure time
    const canProceed = isDentalService 
      ? (service && venueDate && arrivalTime && (availableDoctors.length === 0 || selectedDoctorId))
      : (service && venueDate && arrivalTime && departureTime);

    if (canProceed) {
      let durationHours, durationMinutes;

      if (isDentalService) {
        // For dental services, get duration from selected doctor
        const selectedDoctor = availableDoctors.find(d => d.id === selectedDoctorId);
        if (selectedDoctor && selectedDoctor.service_duration_minutes) {
          const totalMinutes = selectedDoctor.service_duration_minutes;
          durationHours = Math.floor(totalMinutes / 60);
          durationMinutes = totalMinutes % 60;
        } else {
          // Default to 1 hour if no duration specified
          durationHours = 1;
          durationMinutes = 0;
        }
      } else {
        // For regular services, get duration from departureTime
        [durationHours, durationMinutes] = departureTime.split(':').map(Number);
      }

      const durationMs = (durationHours * 60 + durationMinutes) * 60 * 1000;
      
      // Parse arrival time components to avoid timezone issues
      const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
      const arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute;
      
      // Calculate departure time in minutes since midnight
      const departureTotalMinutes = arrivalTotalMinutes + (durationHours * 60 + durationMinutes);
      
      // Handle overnight bookings (next day)
      const finalMinutes = departureTotalMinutes % (24 * 60);
      const finalHour = Math.floor(finalMinutes / 60);
      const finalMinute = finalMinutes % 60;
      
      const actualDepartureTime = `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
      
      // Validate booking time range against venue closing time
      const validation = validateBookingTimeRange(
        arrivalTime,
        actualDepartureTime,
        workingHours,
        venueDate,
        openingTime,
        closingTime
      );

      if (!validation.isValid) {
        toast({
          title: "Invalid booking time",
          description: validation.errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      onConfirm({
        service,
        numberOfTables,
        tableConfigurations,
        arrivalTime,
        departureTime: actualDepartureTime,
        selectedDoctorId: isDentalService ? selectedDoctorId || undefined : undefined,

        // Include pricing and discount information
        originalPrice: totalPrice,
        finalPrice: finalPrice,
        savings: savings,
        appliedDiscounts: discountData?.appliedDiscounts || [],
        discountBreakdown: discountData?.discountBreakdown || {}
      });
      // Reset form
      setNumberOfTables(1);
      setTableConfigurations([{ table_number: 1, guest_count: 1 }]);
      setArrivalTime("");
      setDepartureTime("");
      setSelectedDoctorId(null);

      // Venue page (no parent modal): consume our own history entry so user needs only one Back afterwards
      const depth = modalHistory.getDepth();
      if (depth === 1) {
        try { registrationRef.current?.closeManually(); } catch {}
        // Do not call onClose here; popstate will close us via onOpenChange
      } else {
        // Nested modal (main page): simply close without affecting parent
        onClose();
      }
    }
  };

  // Calculate total price based on duration and pricing model
  const calculateTotalPrice = () => {
    // For dental services, use the selected doctor's price (when doctor is selected)
    if (isDentalService && selectedDoctorId) {
      const selectedDoctor = availableDoctors.find(d => d.id === selectedDoctorId);
      const doctorPrice = Number(selectedDoctor?.service_total_price) || 0;
      console.log('🦷 Dental service price calculation:', {
        selectedDoctorId,
        doctorName: selectedDoctor?.doctor_name,
        doctorLastName: selectedDoctor?.doctor_last_name,
        serviceTotalPrice: selectedDoctor?.service_total_price,
        calculatedPrice: doctorPrice
      });
      return doctorPrice;
    }

    if (!service || !arrivalTime || (!isDentalService && !departureTime)) {
      if (isPerTableService(service?.pricing_model)) {
        // For table-wise: price per table * number of tables
        return service ? calculateGuestPrice(service, 1, numberOfTables, 1) || 0 : 0;
      }
      // For guest-wise: calculate price per table based on guest count at each table
      return tableConfigurations.reduce((total, config) => {
        const guestPrice = service ? calculateGuestPrice(service, config.guest_count, 1, 1) : 0;
        return total + (guestPrice || 0);
      }, 0);
    }
    
    // Parse duration from departureTime (which now stores duration like "01:30" for 1.5 hours)
    const [durationHours, durationMinutes] = departureTime.split(':').map(Number);
    const hours = durationHours + (durationMinutes / 60);
    
            // console.log(`🔍 ServiceBookingDialog - calculateTotalPrice: Service ${service.services?.name || 'Unknown'}, Pricing model: ${service.pricing_model || 'Unknown'}, Duration: ${departureTime}, Hours: ${hours}`);
    
          if (isPerTableService(service.pricing_model)) {
      // Table-wise pricing: price per table * number of tables * hours
      const price = calculateGuestPrice(service, 1, numberOfTables, hours) || 0;
      console.log(`💰 Table-wise total: ${numberOfTables} tables * ${hours} hours = ${price}`);
      return price;
    }
    
    // Guest-wise pricing: calculate per table based on guest count, then sum all tables
    const totalPrice = tableConfigurations.reduce((total, config) => {
      const guestPrice = calculateGuestPrice(service, config.guest_count, 1, hours);
      console.log(`💰 Guest-wise table ${config.table_number}: ${config.guest_count} guests = ${guestPrice}`);
      return total + (guestPrice || 0);
    }, 0);
    
    console.log(`💰 Guest-wise total: ${totalPrice}`);
    return totalPrice;
  };

  // Always calculate pricing and discounts - hooks must be called in same order every render
  const totalPrice = calculateTotalPrice();
  const durationHours = arrivalTime && departureTime ? (() => {
    // Parse duration from departureTime (which now stores duration like "01:30" for 1.5 hours)
    const [durationHours, durationMinutes] = departureTime.split(':').map(Number);
    return durationHours + (durationMinutes / 60);
  })() : 1;

  // Get total guests across all tables for discount calculation
  // For table-wise services, guest count is not relevant for pricing or discounts
      const totalGuests = isPerTableService(service?.pricing_model) 
    ? 0 
    : tableConfigurations.reduce((sum, config) => sum + config.guest_count, 0);

  // Use discount calculation hook - only when service is available and has valid data
  // console.log('🔍 ServiceBookingDialog - Hook parameters:', {
  //   serviceId: service?.id,
  //   totalPrice,
  //   durationHours,
  //   totalGuests,
  //   arrivalTime: arrivalTime || "09:00",
  //   enabled: !!service && !!service.id && totalPrice > 0
  // });

  // For dental services, skip discount calculations and use exact doctor price
  const { data: discountData, isLoading: discountLoading } = useServiceDiscountCalculation(
    service?.id, 
    totalPrice, 
    durationHours, 
    totalGuests,
    arrivalTime || "09:00",
    // Calculate actual departure time for discount calculation
    arrivalTime && departureTime ? (() => {
      const [durationHours, durationMinutes] = departureTime.split(':').map(Number);
      
      // Parse arrival time components to avoid timezone issues
      const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
      const arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute;
      
      // Calculate departure time in minutes since midnight
      const departureTotalMinutes = arrivalTotalMinutes + (durationHours * 60 + durationMinutes);
      
      // Handle overnight bookings (next day)
      const finalMinutes = departureTotalMinutes % (24 * 60);
      const finalHour = Math.floor(finalMinutes / 60);
      const finalMinute = finalMinutes % 60;
      
      return `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
    })() : "10:00",
    !!service && !!service.id && totalPrice > 0 && !isDentalService, // Disable discount calculation for dental services
    isPerTableService(service?.pricing_model) // Pass table-wise service flag
  );

  // Debug logging for discount calculation
  // console.log('🔍 ServiceBookingDialog - Discount calculation result:', {
  //   serviceId: service?.id,
  //   discountData,
  //   totalPrice,
  //   finalPrice: discountData?.finalPrice || totalPrice,
  //   savings: discountData?.totalSavings || 0,
  //   appliedDiscounts: discountData?.appliedDiscounts,
  //   isLoading: discountLoading
  // });

  // For dental services, use the exact doctor price without any discounts
  const finalPrice = isDentalService ? totalPrice : (discountData?.finalPrice || totalPrice);
  const savings = isDentalService ? 0 : (discountData?.totalSavings || 0);

  // Debug logging for price calculation
  if (isDentalService && selectedDoctorId) {
    console.log('🦷 Final dental price calculation:', {
      isDentalService,
      selectedDoctorId,
      totalPrice,
      finalPrice,
      savings,
      discountApplied: discountData?.finalPrice !== totalPrice
    });
  }

  // Early return after all hooks are called
  if (!service) return null;

  // Get current language
  const currentLanguage = i18n.language as 'en' | 'ka';
  
  // Get custom labels with fallbacks
  const tableLabel = getTableLabel(service, t('pricing.table'), currentLanguage);
  const guestLabel = getGuestLabel(service, t('pricing.guest'), currentLanguage);
  

  // Calculate optimal dropdown direction based on available space
  const getDropdownDirection = () => {
    if (typeof window === 'undefined') return 'bottom';
    
    // Get the position of the time selection section
    const timeSection = document.querySelector('[data-time-section]');
    if (!timeSection) return 'bottom';
    
    const rect = timeSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // If there's more space above than below, open upward
    // Otherwise, open downward
    return spaceAbove > spaceBelow ? 'top' : 'bottom';
  };

  const dropdownDirection = getDropdownDirection();

  // Shared content component for both Dialog and Drawer
  const BookingContent = () => (
    <div className="space-y-6">

          {/* Availability Information */}
          {venueDate && (workingHours || (openingTime && closingTime)) && (
            <div className="text-center">
              <p className={cn(
                "font-bold text-red-600",
                isMobile ? "text-base" : "text-sm"
              )}>
                {t('booking.available')}: {(() => {
                  if (workingHours && venueDate) {
                    const key = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][venueDate.getDay()] as keyof import('@/components/DailyWorkingHours').WorkingHours;
                    const s: any = (workingHours as any)[key];
                    if (s && !s.closed) {
                      return formatWorkingHoursDisplay(s.open, s.close);
                    }
                    return t('common.closed');
                  }
                  // Fallback to old format
                  if (openingTime && closingTime) {
                    return formatWorkingHoursDisplay(openingTime, closingTime);
                  }
                  return t('common.closed');
                })()}
              </p>
            </div>
          )}

          {/* Doctor Selection for Dental Services */}
          {isDentalService && availableDoctors.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Doctor</Label>
              <Select value={selectedDoctorId || ''} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name} {doctor.doctor_last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Selection */}
          {venueDate && (
            <div 
              className={cn(
                "space-y-4",
                isMobile ? "space-y-5" : ""
              )}
              data-time-section
            >
              {isDentalService ? (
                // For dental services: only show arrival time
                <div className="space-y-2">
                  <Select value={arrivalTime} onValueChange={handleArrivalTimeChange}>
                    <SelectTrigger 
                      className={cn(
                        "w-full",
                        isMobile ? "h-12 text-base" : "",
                        !arrivalTime && bookingFlow.currentStep === 'time' && bookingFlow.getGlowClass('time')
                      )}
                    >
                      <SelectValue placeholder="Select Arrival Time" />
                    </SelectTrigger>
                    <SelectContent 
                      className={cn(
                        isMobile ? "max-h-[40vh] bg-background border shadow-lg z-[70]" : "z-[70]"
                      )}
                      position="popper"
                      side={dropdownDirection}
                      align="start"
                      sideOffset={4}
                      alignOffset={0}
                      avoidCollisions={false}
                      sticky="always"
                    >
                      {(() => {
                        const timeSlots = generateTimeSlots();
                        if (timeSlots.length === 0) {
                          return (
                            <div className="p-4 text-center text-muted-foreground">
                              <p className="text-sm font-medium">No available times</p>
                              <p className="text-xs mt-1">
                                {venueDate && new Date().toDateString() === venueDate.toDateString() 
                                  ? "No more arrival times available for today"
                                  : "No arrival times available for this date"
                                }
                              </p>
                            </div>
                          );
                        }
                        return timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                // For regular services: show both arrival time and duration
                <div className={cn(
                  "grid gap-3",
                  isMobile ? "grid-cols-1 gap-4" : "grid-cols-2"
                )}>
                  <div className="space-y-2">
                    <Select value={arrivalTime} onValueChange={handleArrivalTimeChange}>
                      <SelectTrigger 
                        className={cn(
                          "w-full",
                          isMobile ? "h-12 text-base" : "",
                          !arrivalTime && bookingFlow.currentStep === 'time' && bookingFlow.getGlowClass('time')
                        )}
                      >
                        <SelectValue placeholder={t('booking.selectTime')} />
                      </SelectTrigger>
                      <SelectContent 
                        className={cn(
                          isMobile ? "max-h-[40vh] bg-background border shadow-lg z-[70]" : "z-[70]"
                        )}
                        position="popper"
                        side={dropdownDirection}
                        align="start"
                        sideOffset={4}
                        alignOffset={0}
                        avoidCollisions={false}
                        sticky="always"
                      >
                        {(() => {
                          const timeSlots = generateTimeSlots();
                          if (timeSlots.length === 0) {
                            return (
                              <div className="p-4 text-center text-muted-foreground">
                                <p className="text-sm font-medium">No available times</p>
                                <p className="text-xs mt-1">
                                  {venueDate && new Date().toDateString() === venueDate.toDateString() 
                                    ? "No more arrival times available for today"
                                    : "No arrival times available for this date"
                                  }
                                </p>
                              </div>
                            );
                          }
                          return timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Select 
                      value={departureTime} 
                      onValueChange={handleDepartureTimeChange}
                      disabled={!arrivalTime}
                    >
                      <SelectTrigger 
                        className={cn(
                          "w-full",
                          isMobile ? "h-12 text-base" : "",
                          !departureTime && arrivalTime && bookingFlow.currentStep === 'time' && bookingFlow.getGlowClass('time')
                        )}
                      >
                        <SelectValue placeholder={t('booking.selectDuration')} />
                      </SelectTrigger>
                      <SelectContent 
                        className={cn(
                          isMobile ? "max-h-[40vh] bg-background border shadow-lg z-[70]" : "z-[70]"
                        )}
                        position="popper"
                        side={dropdownDirection}
                        align="start"
                        sideOffset={4}
                        alignOffset={0}
                        avoidCollisions={false}
                        sticky="always"
                      >
                        {(() => {
                          const durationOptions = generateDurationOptions();
                          if (durationOptions.length === 0) {
                            return (
                              <div className="p-4 text-center text-muted-foreground">
                                <p className="text-sm font-medium">No available durations</p>
                                <p className="text-xs mt-1">
                                  {venueDate && new Date().toDateString() === venueDate.toDateString() 
                                    ? "No more time slots available for today"
                                    : "No time slots available for this date"
                                  }
                                </p>
                              </div>
                            );
                          }
                          return durationOptions.map((duration) => (
                            <SelectItem key={duration.value} value={duration.value}>
                              {duration.label}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table Configuration - Different UI for different pricing models (hidden for dental services) */}
          {!isDentalService && isPerTableService(service?.pricing_model) ? (
            /* Table-wise pricing: Simple table count selector */
            <div className="space-y-3">
              <div className={cn(
                "flex items-center justify-between border rounded-lg",
                isMobile ? "p-4" : "p-3"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    isMobile ? "text-base" : "text-sm"
                  )}>{t('booking.tables', { table: tableLabel })}</span>
                </div>
                <div className={cn(
                  "flex items-center",
                  isMobile ? "gap-4" : "gap-3"
                )}>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={() => setNumberOfTables(Math.max(1, numberOfTables - 1))}
                    disabled={numberOfTables <= 1}
                    className={cn(
                      "p-0",
                      isMobile ? "h-10 w-10" : "h-8 w-8"
                    )}
                  >
                    <Minus className={cn(
                      isMobile ? "h-4 w-4" : "h-3 w-3"
                    )} />
                  </Button>
                  <span className={cn(
                    "text-center font-medium",
                    isMobile ? "w-10 text-base" : "w-8 text-sm"
                  )}>{numberOfTables}</span>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "sm"}
                    onClick={() => setNumberOfTables(Math.min((service as any)?.max_tables || 10, numberOfTables + 1))}
                    disabled={numberOfTables >= ((service as any)?.max_tables || 10)}
                    className={cn(
                      "p-0",
                      isMobile ? "h-10 w-10" : "h-8 w-8"
                    )}
                  >
                    <Plus className={cn(
                      isMobile ? "h-4 w-4" : "h-3 w-3"
                    )} />
                  </Button>
                </div>
              </div>
            </div>
          ) : !isDentalService ? (
            /* Guest-wise pricing: Individual table cards */
            <div className="space-y-3">
              <div className={cn(
                "space-y-3",
                isMobile ? "space-y-4" : ""
              )}>
                {tableConfigurations.map((config, index) => (
                  <Card key={config.table_number} className={cn(
                    isMobile ? "p-5" : "p-4"
                  )}>
                    <div className={cn(
                      "flex items-center justify-between",
                      isMobile ? "flex-col gap-4" : ""
                    )}>
                        <div className={cn(
                          "flex items-center gap-3",
                          isMobile ? "w-full" : ""
                        )}>
                          <div className="flex-1">
                            <div className={cn(
                              "font-medium",
                              isMobile ? "text-base" : "text-sm"
                            )}>{t('booking.table', { table: tableLabel })} {config.table_number}</div>
                          </div>
                        </div>
                      
                      <div className={cn(
                        "flex items-center",
                        isMobile ? "gap-4 w-full justify-between" : "gap-3"
                      )}>
                        {/* Guest count controls with clear labeling */}
                        <div className={cn(
                          "flex items-center gap-2",
                          isMobile ? "bg-muted/20 rounded-lg p-2" : "bg-muted/10 rounded-md p-1"
                        )}>
                          <span className={cn(
                            "text-muted-foreground font-medium",
                            isMobile ? "text-sm" : "text-xs"
                          )}>
                            {t('booking.guests', { guest: guestLabel })}:
                          </span>
                          <div className={cn(
                            "flex items-center",
                            isMobile ? "gap-2" : "gap-1"
                          )}>
                            <Button
                              variant="outline"
                              size={isMobile ? "sm" : "sm"}
                              onClick={() => {
                                const newGuestCount = Math.max(1, config.guest_count - 1);
                                if (isValidGuestCount(service, newGuestCount)) {
                                  setTableConfigurations(prev =>
                                    prev.map(c =>
                                      c.table_number === config.table_number
                                        ? { ...c, guest_count: newGuestCount }
                                        : c
                                    )
                                  );
                                }
                              }}
                              disabled={config.guest_count <= 1}
                              className={cn(
                                "p-0",
                                isMobile ? "h-8 w-8" : "h-6 w-6"
                              )}
                              title={t('booking.removeGuest', { guest: guestLabel })}
                            >
                              <Minus className={cn(
                                isMobile ? "h-3 w-3" : "h-2 w-2"
                              )} />
                            </Button>
                            <span className={cn(
                              "text-center font-semibold min-w-0",
                              isMobile ? "px-2 text-base" : "px-1 text-sm"
                            )}>{config.guest_count}</span>
                            <Button
                              variant="outline"
                              size={isMobile ? "sm" : "sm"}
                              onClick={() => {
                                const newGuestCount = Math.min(getMaxGuestCount(service) || 20, config.guest_count + 1);
                                if (isValidGuestCount(service, newGuestCount)) {
                                  setTableConfigurations(prev =>
                                    prev.map(c =>
                                      c.table_number === config.table_number
                                        ? { ...c, guest_count: newGuestCount }
                                        : c
                                    )
                                  );
                                }
                              }}
                              disabled={
                                config.guest_count >= (getMaxGuestCount(service) || 20) ||
                                !isValidGuestCount(service, config.guest_count + 1)
                              }
                              className={cn(
                                "p-0",
                                isMobile ? "h-8 w-8" : "h-6 w-6"
                              )}
                              title={t('booking.addGuest', { guest: guestLabel })}
                            >
                              <Plus className={cn(
                                isMobile ? "h-3 w-3" : "h-2 w-2"
                              )} />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Remove table button - only show if more than one table */}
                        {tableConfigurations.length > 1 && (
                          <Button
                            variant="outline"
                            size={isMobile ? "default" : "sm"}
                            onClick={() => {
                              const newConfigs = tableConfigurations.filter(c => c.table_number !== config.table_number);
                              // Renumber tables to maintain consecutive numbering
                              const renumberedConfigs = newConfigs.map((c, idx) => ({
                                ...c,
                                table_number: idx + 1
                              }));
                              setTableConfigurations(renumberedConfigs);
                              setNumberOfTables(renumberedConfigs.length);
                            }}
                            className={cn(
                              "p-0 text-destructive hover:text-destructive",
                              isMobile ? "h-10 w-10" : "h-8 w-8"
                            )}
                          >
                            <X className={cn(
                              isMobile ? "h-4 w-4" : "h-3 w-3"
                            )} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Add another table button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    const maxTables = ((service as any)?.max_tables || 10);
                    if (tableConfigurations.length >= maxTables) {
                      setShowTableLimitMessage(true);
                      return;
                    }
                    const nextTableNumber = Math.max(...tableConfigurations.map(c => c.table_number)) + 1;
                    setTableConfigurations(prev => [
                      ...prev,
                      { table_number: nextTableNumber, guest_count: 1 }
                    ]);
                    setNumberOfTables(nextTableNumber);
                    setShowTableLimitMessage(false);
                  }}
                  className={cn(
                    "w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5",
                    isMobile ? "h-14 text-base" : "h-12",
                    "text-muted-foreground hover:text-primary transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "rounded-full bg-primary/10 p-1",
                      isMobile ? "p-1.5" : "p-1"
                    )}>
                      <Plus className={cn(
                        "text-primary",
                        isMobile ? "h-4 w-4" : "h-3 w-3"
                      )} />
                    </div>
                    <span className="font-medium">{t('booking.addAnotherTable', { table: tableLabel })}</span>
                  </div>
                </Button>
                
                {/* Table limit reached message */}
                {showTableLimitMessage && (
                  <Alert className="mt-3 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 relative">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 pr-10">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {t('booking.maxTablesReachedTitle', { table: tableLabel })}
                        </div>
                        <div className="text-sm">
                          {t('booking.maxTablesReachedMessage', { table: tableLabel, count: (service as any)?.max_tables || 10 })}
                        </div>
                      </div>
                    </AlertDescription>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowTableLimitMessage(false)}
                      className="absolute top-3 right-3 !p-1 !px-1 !py-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-800/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Alert>
                )}
              </div>
            </div>
          ) : null}

          {/* Total Price */}
          {(isDentalService ? (arrivalTime && (availableDoctors.length === 0 || selectedDoctorId)) : (arrivalTime && departureTime)) && (
            <div className="border-t pt-4 space-y-2">
              {savings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('booking.originalPrice')}</span>
                  <span className="line-through text-muted-foreground">{totalPrice.toFixed(2)} {t('booking.currency')}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>{t('booking.discountSavings')}</span>
                  <span>-{savings.toFixed(2)} {t('booking.currency')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t('booking.total')}</span>
                <span className={savings > 0 ? "text-green-600" : ""}>{finalPrice.toFixed(2)} {t('booking.currency')}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={cn(
            "flex gap-3",
            isMobile ? "gap-4 pt-4 border-t" : ""
          )}>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className={cn(
                "flex-1",
                isMobile ? "h-12 text-base" : ""
              )}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={
                isDentalService 
                  ? (!venueDate || !arrivalTime || (availableDoctors.length > 0 && !selectedDoctorId))
                  : (!venueDate || !arrivalTime || !departureTime)
              }
              className={cn(
                "flex-1",
                isMobile ? "h-12 text-base" : ""
              )}
            >
              {t('common.continue')}
            </Button>
          </div>
    </div>
  );

  // Don't render if no service is provided
  if (!service) {
    return null;
  }

  // Controlled close handler to prevent unintended closures
  const handleDialogClose = (open: boolean) => {
    console.log('ServiceBookingDialog - Dialog close requested:', { open, serviceName: service?.services?.name });
    if (!open) {
      onClose();
    }
  };

  // Conditional rendering for mobile vs desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleDialogClose}>
        <DrawerContent 
          className="max-h-[90vh] bg-background dark:bg-gray-900 border-t shadow-2xl flex flex-col z-[60]"
        >
          <DrawerHeader className="flex-shrink-0 pb-1 px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg md:text-xl font-semibold tracking-tight">
                {t('booking.book')} {translateService({
                  name: service.services?.name || service.name || 'Unknown Service',
                  name_en: service.services?.name_en,
                  name_ka: service.services?.name_ka
                })}
              </DrawerTitle>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pt-1 pb-4 bg-background dark:bg-gray-900">
            {/* Service discount badges */}
            <div className="mb-4">
              <DiscountBadgeList
                discountData={{
                  overallDiscountPercent: service.overall_discount_percent,
                  groupDiscounts: service.group_discounts,
                  timeslotDiscounts: service.timeslot_discounts,
                  freeHourDiscounts: service.free_hour_discounts
                }}
                serviceId={service.id}
                size="sm"
                maxBadges={4}
              />
            </div>
            <BookingContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl border shadow-2xl bg-background text-foreground">
        <DialogHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg md:text-xl font-semibold tracking-tight">
              {t('booking.book')} {translateService({
                name: service.services?.name || service.name || 'Unknown Service',
                name_en: service.services?.name_en,
                name_ka: service.services?.name_ka
              })}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pt-1 pb-4 bg-background">
          {/* Service discount badges */}
          <div className="mb-4">
            <DiscountBadgeList
              discountData={{
                overallDiscountPercent: service.overall_discount_percent,
                groupDiscounts: service.group_discounts,
                timeslotDiscounts: service.timeslot_discounts,
                freeHourDiscounts: service.free_hour_discounts
              }}
              serviceId={service.id}
              size="sm"
              maxBadges={4}
            />
          </div>
          <BookingContent />
        </div>
        
        {modalHistory.getDepth() <= 1 && (
          <div className="hidden" />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServiceBookingDialog;
