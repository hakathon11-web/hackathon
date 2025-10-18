import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Square, CreditCard } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { useSettings } from '../context/SettingsContext';
import { useVenueProducts } from '@/hooks/useVenueProducts';
import { addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getGuestLabel, getTableLabel } from '@/utils/pricingLabels';
import { isGuestWiseService } from '@/constants/services';
import { calculateGuestPrice } from '@/utils/guestPricing';
import { useCreateEmployeeEvent, useUpdateEmployeeEvent, useDeleteEmployeeEvent } from '@/hooks/useEmployeeEvents';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth';
import { useEventStateMachine } from '@/hooks/useEventStateMachine';
import { EventStatus, EventDurationType } from '@/types/eventStatus';
import { roundDateToMinuteStep, calculateEventDuration, formatDuration } from '@/utils/eventDuration';
import { validateEvent, getValidationErrorMessage, getFieldErrors, validateEventConflicts } from '@/utils/eventValidation';
import { getTodaySchedule } from '@/utils/workingHours';
import { useVenue } from '@/hooks/useVenues';
import type { EventProduct } from '../types.ts';
import type { VenueCalendarEvent } from '@/hooks/useVenueCalendarData';
 

interface EventFormProps {
  selectedResourceId?: string;
  selectedDate?: Date;
  selectedTimeSlot?: string;
  event?: VenueCalendarEvent; // If editing existing event
  onClose: () => void;
  onSuccess: () => void;
  isQuickAdd?: boolean; // If this is a quick add for current time
  scheduleStartHour?: number;
  scheduleEndHour?: number;
  venueId?: string; // Venue ID for fetching products
}

export function EventForm({ 
  selectedResourceId, 
  selectedDate, 
  selectedTimeSlot, 
  event, 
  onClose, 
  onSuccess,
  isQuickAdd = false,
  scheduleStartHour = 13,
  scheduleEndHour = 3,
  venueId
}: EventFormProps) {
  const { state, dispatch } = useScheduler();
  const { resources } = state;
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as 'en' | 'ka';
  const { employee } = useEmployeeAuth();
  
  // Database operations for employee events
  const createEmployeeEvent = useCreateEmployeeEvent();
  const updateEmployeeEvent = useUpdateEmployeeEvent();
  const deleteEmployeeEvent = useDeleteEmployeeEvent();
  
  // Fetch venue data to get working hours
  const { data: venue } = useVenue(venueId || '');
  
  // Fetch venue products from database
  const { data: venueProducts = [] } = useVenueProducts(venueId || '');
  
  // Fetch venue services to get service labels
  const [venueServices, setVenueServices] = useState<any[]>([]);
  
  // Get today's business hours from venue working hours
  const todaySchedule = getTodaySchedule(venue?.working_hours);
  const actualBusinessStartHour = todaySchedule ? parseInt(todaySchedule.open.split(':')[0]) : scheduleStartHour;
  const actualBusinessEndHour = todaySchedule ? parseInt(todaySchedule.close.split(':')[0]) : scheduleEndHour;
  
  useEffect(() => {
    if (!venueId) return;
    
    const fetchVenueServices = async () => {
      if (!venueId) return;
      
      const { supabase } = await import('@/integrations/supabase/client');
      const { isUuid } = await import('@/utils/isUuid');

      const query = isUuid(venueId) 
        ? supabase.from('venue_services').select(`
          id,
          name,
          price,
          max_tables,
          service_id,
          guest_pricing_rules,
          services (
            name,
            pricing_model,
            table_label,
            guest_label,
            table_label_ka,
            guest_label_ka
          )
        `).eq('venue_id', venueId as any)
        : supabase.from('venue_services').select(`
          id,
          name,
          price,
          max_tables,
          service_id,
          guest_pricing_rules,
          services (
            name,
            pricing_model,
            table_label,
            guest_label,
            table_label_ka,
            guest_label_ka
          )
        `).limit(0);

      const { data, error } = await query;
      
      if (!error && data) {
        setVenueServices(data);
      }
    };
    
    fetchVenueServices();
  }, [venueId]);

  const isEditing = !!event;
  const isCustomerBooking = !!event && event.eventType === 'booking';

  // Helper to extract bookingServiceId from event.id like: booking-{bookingId}-service-{bookingServiceId}-table-{n}
  const extractBookingServiceId = (eventId: string): string | null => {
    // Capture the UUID that follows "-service-" and ends before "-table-" or string end
    const match = eventId.match(/-service-([a-f0-9-]{36})(?:-table-|$)/);
    if (match && match[1]) return match[1];
    // Fallback: split by markers to avoid trailing characters
    const afterService = eventId.split('-service-')[1];
    if (!afterService) return null;
    const serviceId = afterService.split('-table-')[0];
    return serviceId && serviceId.length >= 36 ? serviceId.slice(0, 36) : null;
  };

  // Helper to extract venueServiceId from a resourceId like: venue-{venueServiceId}-seat-{n}
  const extractVenueServiceIdFromResourceId = (resourceId: string | undefined): string | null => {
    if (!resourceId) return null;
    const match = resourceId.match(/^venue-([a-f0-9-]+)-seat-/);
    return match && match[1] ? match[1] : null;
  };

  // Helper to extract the original seat number from event.id (booking-...-table-{n})
  const extractSeatNumberFromEventId = (eventId: string): number | null => {
    const match = eventId.match(/-table-(\d+)$/);
    return match && match[1] ? parseInt(match[1]) : null;
  };

  // Helper to extract booking ID from event.id (booking-{bookingId}-service-...)
  const extractBookingIdFromEventId = (eventId: string): string | null => {
    const match = eventId.match(/^booking-([a-f0-9-]{36})-service/);
    return match && match[1] ? match[1] : null;
  };
  
  // Initialize event state machine
  const eventStateMachine = useEventStateMachine({
    event: event || {
      id: '',
      resourceId: selectedResourceId || '',
      startDate: selectedDate || new Date(),
      startTime: selectedTimeSlot || `${actualBusinessStartHour.toString().padStart(2, '0')}:00`,
      duration: settings.defaultEventDurationHours,
      guestCount: 1,
      color: isQuickAdd ? '#10b981' : '#3b82f6',
      specialRequests: '',
      isOpenDuration: false,
      eventStatus: undefined,
      actualStartTime: undefined,
      actualEndTime: undefined
    },
    currentTime: new Date(),
    minuteStep: settings.minuteStep
  });


  const [formData, setFormData] = useState({
    resourceId: selectedResourceId || event?.resourceId || '',
    startTime: selectedTimeSlot || event?.startTime || `${actualBusinessStartHour.toString().padStart(2, '0')}:00`,
    duration: event?.duration || (isQuickAdd ? settings.defaultEventDurationHours : settings.defaultEventDurationHours),
    color: event?.color || (isQuickAdd ? '#10b981' : '#3b82f6'), // Green for quick add
    isOpenDuration: event?.isOpenDuration || false,
    guestCount: event?.guestCount || 1, // Add guest count for pricing calculation
    eventType: event?.eventType || 'employee', // Default to employee-created event
    specialRequests: event?.specialRequests || null,
    paymentMethod: event?.paymentMethod || '', // Add payment method
  });

  // Manage product selections as a map of productId -> quantity
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (event?.products && event.products.length > 0) {
      for (const p of event.products) {
        initial[p.productId] = p.quantity;
      }
    }
    return initial;
  });

  // Search and add flow for large product catalogs
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  
  // Convert venue products to the format expected by the product picker
  const availableProducts = venueProducts
    .filter(p => p.is_available)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock_quantity: p.stock_quantity
    }));
  
  const filteredCatalog = availableProducts
    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    .slice(0, 10);
  const defaultCatalog = availableProducts.slice(0, 10);
  const catalogToShow = productSearch ? filteredCatalog : defaultCatalog;

  // Helper to check if a product is in stock and how much is available
  const getProductStockStatus = (productId: string, requestedQty: number = 0) => {
    const product = venueProducts.find(p => p.id === productId);
    if (!product) return { inStock: false, available: 0, message: 'Product not found' };
    
    const stockQty = product.stock_quantity ?? Infinity; // If no stock tracking, assume unlimited
    const currentQty = productQuantities[productId] || 0;
    const availableToAdd = stockQty - currentQty;
    
    if (stockQty === 0) {
      return { inStock: false, available: 0, message: 'Out of stock' };
    }
    
    if (requestedQty > availableToAdd) {
      return { inStock: false, available: availableToAdd, message: `Only ${availableToAdd} available` };
    }
    
    return { inStock: true, available: availableToAdd, message: `${stockQty} in stock` };
  };

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const colors = [
    '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', 
    '#10b981', '#ec4899', '#06b6d4', '#84cc16'
  ];

  const validateForm = (): boolean => {
    const eventData = {
      resourceId: formData.resourceId,
      startDate: selectedDate || event?.startDate || new Date(),
      startTime: formData.startTime,
      duration: formData.duration,
      guestCount: formData.guestCount,
      isOpenDuration: formData.isOpenDuration,
      eventStatus: event?.eventStatus,
      actualStartTime: event?.actualStartTime,
      actualEndTime: event?.actualEndTime,
      color: formData.color,
      specialRequests: formData.specialRequests,
      paymentMethod: formData.paymentMethod
    };


    const validation = validateEvent(eventData, {
      businessStartHour: actualBusinessStartHour,
      businessEndHour: actualBusinessEndHour,
      minDurationHours: 0.25,
      maxDurationHours: 24,
      durationStepHours: settings.durationStepMinutes / 60,
      maxGuestCount: 20,
      requireResource: true,
      allowPastDates: true  // Allow employees to create events for past dates
    });

    // Check for conflicts with existing events
    if (validation.isValid && formData.resourceId) {
      const existingEventsForValidation = state.events.map(e => ({
        id: e.id,
        resourceId: e.resourceId,
        startDate: e.startDate,
        startTime: e.startTime,
        duration: e.duration,
        isOpenDuration: e.isOpenDuration,
        eventStatus: e.eventStatus,
        actualStartTime: e.actualStartTime,
        actualEndTime: e.actualEndTime
      }));
      
      const conflictValidation = validateEventConflicts(
        eventData,
        existingEventsForValidation,
        event?.id
      );

      if (!conflictValidation.isValid) {
        validation.errors.push(...conflictValidation.errors);
        validation.isValid = false;
      }
    }

    // Convert validation errors to form errors
    const newErrors: Record<string, string> = {};
    validation.errors.forEach(error => {
      newErrors[error.field] = error.message;
    });

    setValidationErrors(newErrors);
    return validation.isValid;
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60); // Convert to decimal hours for precise comparison
  };

  // Helper function to check if a time is within business hours
  const isTimeWithinBusinessHours = (hour: number, minute: number = 0): boolean => {
    const timeDecimal = hour + (minute / 60);
    const spansMidnight = scheduleEndHour < scheduleStartHour;
    
    if (spansMidnight) {
      // For midnight-spanning schedules (e.g., 13:00 - 03:00)
      // Valid times: 13:00-23:59 (current day) and 00:00-03:00 (next day)
      return (timeDecimal >= scheduleStartHour && timeDecimal <= 23.999) || 
             (timeDecimal >= 0 && timeDecimal <= scheduleEndHour);
    } else {
      // Regular schedule (e.g., 09:00 - 21:00)
      return timeDecimal >= scheduleStartHour && timeDecimal <= scheduleEndHour;
    }
  };



  // The conflict checking is now handled in the validation system above

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!employee || !employee.id) {
      console.error('Missing employee or employee ID:', { employee });
      throw new Error('Employee authentication is required. Please log in again.');
    }
    if (!venueId) {
      console.error('Missing venue ID:', { venueId });
      throw new Error('Venue ID is required.');
    }

    try {
      const eventDate = selectedDate || event?.startDate || new Date();
      
      // Handle overnight events - if duration extends past midnight, end date is next day
      const startHour = parseTime(formData.startTime);
      
      // For open duration events, we don't know the end time yet, so we can't determine if it's overnight
      // For fixed duration events, calculate the end hour
      const endHour = formData.isOpenDuration ? null : startHour + formData.duration;
      const isOvernight = endHour !== null && endHour >= 24;
      const endDate = isOvernight ? addDays(eventDate, 1) : eventDate;

      // If editing an active open-duration event and start time changed, update actualStartTime
      const eventDateForActual = selectedDate || event?.startDate || new Date();
      const [selH, selM] = formData.startTime.split(':').map(Number);
      const computedActualStart = roundDateToMinuteStep(new Date(new Date(eventDateForActual).setHours(selH, selM, 0, 0)));

      const selectedResource = resources.find(r => r.id === formData.resourceId);
      
      // Validate that we have a selected resource
      if (!selectedResource) {
        console.error('No resource selected:', { resourceId: formData.resourceId, availableResources: resources.length });
        throw new Error('Please select a valid seat.');
      }
      
      // Validate that the selected resource has a venueServiceId
      if (!selectedResource.venueServiceId) {
        console.error('Selected resource missing venueServiceId:', { selectedResource, resources });
        throw new Error('Selected seat is missing service information. Please try selecting a different seat.');
      }
      
      const venueService = venueServices.find(vs => vs.id === selectedResource.venueServiceId);
      
      // Validate that we found the venue service
      if (!venueService) {
        console.error('Venue service not found:', { 
          venueServiceId: selectedResource.venueServiceId, 
          availableVenueServices: venueServices.length,
          venueServices: venueServices.map(vs => ({ id: vs.id, name: vs.name }))
        });
        throw new Error('Could not find service information for the selected seat. Please try again.');
      }
      
      // Validate that the venue service has an ID
      if (!venueService.id) {
        console.error('Venue service missing ID:', { venueService });
        throw new Error('Service information is incomplete. Please try again.');
      }
      
      const service = venueService?.services;
      
      
      // Calculate total price using the proper pricing utility
      let servicePrice = 0;
      if (venueService && service && !formData.isOpenDuration) {
        const serviceWithPricing = {
          ...venueService,
          pricing_model: service.pricing_model,
          guest_pricing_rules: venueService.guest_pricing_rules
        };
        servicePrice = calculateGuestPrice(serviceWithPricing, formData.guestCount, 1, formData.duration) || 0;
      }
      
      // Calculate product prices
      const productPrices = Object.entries(productQuantities)
        .filter(([, qty]) => typeof qty === 'number' && qty > 0)
        .reduce((total, [productId, qty]) => {
          const product = availableProducts.find(p => p.id === productId);
          return total + ((product?.price || 0) * qty);
        }, 0);
      
      const totalPrice = servicePrice + productPrices;

          const eventData = {
        resourceId: formData.resourceId,
        startDate: eventDate,
        endDate: endDate,
        startTime: formData.startTime,
        duration: formData.isOpenDuration ? 0 : formData.duration,
        guestCount: formData.guestCount,
        totalPrice: totalPrice,
        serviceName: service?.name || selectedResource?.service,
        pricePerHour: venueService?.price || 0,
        subtotal: totalPrice,
        pricingModel: service?.pricing_model,
        eventType: 'employee' as const,
        color: formData.color,
        isOpenDuration: formData.isOpenDuration,
        actualStartTime: isEditing
          ? (event?.isOpenDuration
              ? (event?.eventStatus === 'active'
                  ? computedActualStart
                  : (event?.eventStatus === 'ended'
                      ? computedActualStart
                      : event?.actualStartTime))
              : event?.actualStartTime)
          : (formData.isOpenDuration ? computedActualStart : undefined),
        actualEndTime: isEditing ? event?.actualEndTime : undefined,
        eventStatus: isEditing ? event?.eventStatus : undefined,
        products: Object.entries(productQuantities)
          .filter(([, qty]) => typeof qty === 'number' && qty > 0)
          .map(([productId, quantity]) => ({ productId, quantity } as EventProduct)),
        specialRequests: formData.specialRequests || undefined,
        paymentMethod: formData.paymentMethod || undefined,
      };

      if (isEditing && isCustomerBooking && event?.id.startsWith('booking-')) {
        // Persist only seat change for customer bookings by updating table_configurations
        const selectedResource = resources.find(r => r.id === formData.resourceId);
        if (!selectedResource) throw new Error('Please select a valid seat.');
        const newSeatMatch = selectedResource.id.match(/-seat-(\d+)$/);
        const newSeatNumber = newSeatMatch && newSeatMatch[1] ? parseInt(newSeatMatch[1]) : 1;
        const bookingServiceId = extractBookingServiceId(event.id);
        if (!bookingServiceId) throw new Error('Could not determine booking service to update.');
        const originalSeatNumber = extractSeatNumberFromEventId(event.id);
        if (originalSeatNumber === null) throw new Error('Could not determine original seat number.');

        const { supabase } = await import('@/integrations/supabase/client');
        
        // Fetch current table_configurations to update only the specific seat
        const { data: bookingServiceData, error: fetchError } = await supabase
          .from('booking_services')
          .select('table_configurations')
          .eq('id' as any, bookingServiceId as any)
          .single();

        if (fetchError) {
          console.error('Error fetching booking service:', fetchError);
          throw new Error('Could not fetch booking service data.');
        }

        // Update table_configurations array - replace only the specific seat
        const currentConfigs = (bookingServiceData?.table_configurations as any[]) || [];
        const updatedConfigs = currentConfigs.map((config: any) => {
          if (config.table_number === originalSeatNumber) {
            // Update this specific seat
            return {
              ...config,
              table_number: newSeatNumber
            };
          }
          // Keep other seats unchanged
          return config;
        });

        // If original seat wasn't found (shouldn't happen), add new one
        if (!currentConfigs.some((c: any) => c.table_number === originalSeatNumber)) {
          updatedConfigs.push({
            table_number: newSeatNumber,
            guest_count: event.guestCount || 1
          });
        }

        // Prefer RPC for security and to bypass 406 issues from .single()
        const employeeIdForRls = employee?.id;
        const { error: rpcError } = await supabase.rpc('reassign_booking_seat', {
          p_booking_service_id: bookingServiceId as any,
          p_employee_id: employeeIdForRls as any,
          p_original_seat: originalSeatNumber as any,
          p_new_seat: newSeatNumber as any
        });
        
        if (rpcError) {
          console.error('RPC error, using fallback:', rpcError);
          // Fallback: use the updated configurations we calculated above
          const { error: updateError } = await supabase
            .from('booking_services')
            .update({ 
              table_configurations: updatedConfigs as any,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id' as any, bookingServiceId as any);
          
          if (updateError) {
            console.error('Fallback update error:', updateError);
            throw new Error('Failed to update seat assignment.');
          }
        }

        // Handle products for customer bookings - get booking ID
        const bookingId = event.bookingId || extractBookingIdFromEventId(event.id);
        if (bookingId) {
          // Get existing booking products to restore stock
          const { data: existingProducts, error: fetchExistingError } = await supabase
            .from('booking_products')
            .select('product_id, quantity')
            .eq('booking_id' as any, bookingId as any);

          if (fetchExistingError) {
            console.error('Error fetching existing booking products:', fetchExistingError);
          } else {
            // Restore stock for existing products
            if (existingProducts && existingProducts.length > 0) {
              for (const existingProduct of existingProducts as any[]) {
                await supabase.rpc('increase_product_stock', {
                  product_id: existingProduct.product_id,
                  quantity: existingProduct.quantity
                });
              }
            }

            // Delete existing booking products
            await supabase
              .from('booking_products')
              .delete()
              .eq('booking_id' as any, bookingId as any);

            // Insert new products if any
            const selectedProducts = Object.entries(productQuantities)
              .filter(([, qty]) => typeof qty === 'number' && qty > 0);
            
            if (selectedProducts.length > 0) {
              // Fetch product details to get current prices
              const productIds = selectedProducts.map(([id]) => id);
              const { data: products } = await supabase
                .from('venue_products')
                .select('id, price')
                .in('id', productIds as any);

              const productInserts = selectedProducts.map(([productId, quantity]) => {
                const productDetails = (products as any)?.find((p: any) => p.id === productId);
                const unitPrice = productDetails?.price || 0;
                const totalPrice = unitPrice * quantity;
                
                return {
                  booking_id: bookingId,
                  product_id: productId,
                  quantity: quantity,
                  unit_price: unitPrice,
                  total_price: totalPrice
                };
              });

              await supabase
                .from('booking_products')
                .insert(productInserts as any);

              // Decrease stock for new products
              for (const [productId, quantity] of selectedProducts) {
                await supabase.rpc('decrease_product_stock', {
                  product_id: productId,
                  quantity: quantity
                });
              }
            }
          }
        }

        // Ensure calendar updates immediately like employee flow
        queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });
        queryClient.refetchQueries({ queryKey: ['venue-calendar-data', venueId] });
      } else if (isEditing && event?.id.startsWith('employee-')) {
        // Update existing employee event in database
        await updateEmployeeEvent.mutateAsync({
          eventId: event.id,
          eventData,
          venueServiceId: venueService.id
        });
      } else {
        // Create new employee event in database
        
        await createEmployeeEvent.mutateAsync({
          eventData,
          employeeId: employee.id,
          venueId,
          venueServiceId: venueService.id
        });
      }

      // Call success callback first, then close
      onSuccess();
      // Note: onSuccess should handle closing the form
    } catch (error) {
      console.error('Error saving employee event:', error);
      // Error handling is done in the mutation hooks
    }
  };

  // End event functionality: directly persist end regardless of state machine
  const handleEndEvent = async () => {
    if (!event) return;
    
    if (window.confirm('End this event?')) {
      try {
        // Update the event with the new status and end time
        const now = new Date();
          const eventData = {
          resourceId: event.resourceId,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          duration: event.duration || 0,
          guestCount: event.guestCount || 1,
          totalPrice: event.totalPrice || 0,
          serviceName: event.serviceName,
          pricePerHour: event.pricePerHour || 0,
          subtotal: event.subtotal || 0,
          pricingModel: event.pricingModel,
          eventType: 'employee' as const,
          color: event.color || '#3b82f6',
          isOpenDuration: false, // ensure we close open duration on end
          actualStartTime: event.actualStartTime,
          actualEndTime: now,
          eventStatus: 'ended' as 'active' | 'ended',
          products: event.products || [],
          specialRequests: event.specialRequests,
          paymentMethod: event.paymentMethod || undefined
        };

        const selectedResource = resources.find(r => r.id === event.resourceId);
        const venueService = venueServices.find(vs => vs.id === selectedResource?.venueServiceId);
        
        if (!venueService) {
          throw new Error('Venue service not found');
        }

        await updateEmployeeEvent.mutateAsync({
          eventId: event.id,
          eventData,
          venueServiceId: venueService.id
        });

        onSuccess();
      } catch (error) {
        console.error('Error ending event:', error);
      }
    }
  };

  // Get event status information from state machine
  const isActiveEvent = eventStateMachine.currentStatus.status === EventStatus.ACTIVE;
  const isEndedEvent = eventStateMachine.currentStatus.status === EventStatus.ENDED;
  const canEndEvent = eventStateMachine.canEnd;
  const canModifyEvent = eventStateMachine.canModify;

  // Generate hour options for the time picker using actual business hours
  const generateHourOptions = () => {
    const options = [];
    const spansMidnight = actualBusinessEndHour < actualBusinessStartHour;
    if (spansMidnight) {
      for (let hour = actualBusinessStartHour; hour <= 23; hour++) {
        options.push({ value: hour, label: `${hour.toString().padStart(2, '0')}:00` });
      }
      for (let hour = 0; hour <= actualBusinessEndHour; hour++) {
        options.push({ value: hour, label: `${hour.toString().padStart(2, '0')}:00` });
      }
    } else {
      for (let hour = actualBusinessStartHour; hour <= actualBusinessEndHour; hour++) {
        options.push({ value: hour, label: `${hour.toString().padStart(2, '0')}:00` });
      }
    }
    
    return options;
  };

  // Generate minute options (5-minute increments for better UX)
  const generateMinuteOptions = () => {
    const options = [];
    for (let minute = 0; minute < 60; minute += settings.minuteStep) {
      options.push({ value: minute, label: minute.toString().padStart(2, '0') });
    }
    return options;
  };

  const hourOptions = generateHourOptions();
  const minuteOptions = generateMinuteOptions();

  // Parse current start time to get hour and minute values
  const parseCurrentTime = () => {
    if (selectedTimeSlot) {
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      const minuteValue = Math.ceil(minutes / settings.minuteStep) * settings.minuteStep; // Round up to step
      return { hour: hours, minute: minuteValue };
    }
    
    // When editing an existing event, initialize from its startTime
    if (event?.startTime) {
      const [hours, minutes] = event.startTime.split(':').map(Number);
      return { hour: hours, minute: minutes };
    }
    
    // For quick add without selectedTimeSlot, use current time
    if (isQuickAdd) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const roundedMinute = Math.ceil(currentMinute / settings.minuteStep) * settings.minuteStep;
      let finalHour = currentHour;
      
      // Handle hour rollover if minutes round up to 60
      if (roundedMinute >= 60) {
        finalHour = currentHour + 1;
      }
      
      const minuteDisplay = roundedMinute >= 60 ? 0 : roundedMinute;
      
      return { hour: finalHour, minute: minuteDisplay };
    }
    
  // Default to first hour option for regular events
  return { hour: hourOptions[0]?.value || actualBusinessStartHour, minute: 0 };
  };

  const [selectedTime, setSelectedTime] = useState(parseCurrentTime());

  // Sync time picker with selectedTimeSlot when it changes
  useEffect(() => {
    if (selectedTimeSlot) {
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      const minuteValue = Math.ceil(minutes / settings.minuteStep) * settings.minuteStep;
      setSelectedTime({ hour: hours, minute: minuteValue });
    } else if (event?.startTime) {
      // When editing, sync time picker with event startTime
      const [hours, minutes] = event.startTime.split(':').map(Number);
      setSelectedTime({ hour: hours, minute: minutes });
    } else if (isQuickAdd) {
      // For quick add without selectedTimeSlot, use current time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const roundedMinute = Math.ceil(currentMinute / settings.minuteStep) * settings.minuteStep;
      let finalHour = currentHour;
      
      // Handle hour rollover if minutes round up to 60
      if (roundedMinute >= 60) {
        finalHour = currentHour + 1;
      }
      
      const minuteDisplay = roundedMinute >= 60 ? 0 : roundedMinute;
      
      setSelectedTime({ hour: finalHour, minute: minuteDisplay });
    }
  }, [selectedTimeSlot, isQuickAdd, event?.startTime]);

  // Update formData.startTime when selectedTime changes
  useEffect(() => {
    const timeString = `${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, startTime: timeString }));
  }, [selectedTime]);

  // Duration adjustment removed - no longer limiting duration based on start time

  // Update formData when time selection changes
  const handleTimeChange = (hour: number, minute: number) => {
    const newTime = { hour, minute };
    setSelectedTime(newTime);
    
    // Convert to 24-hour format for formData
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    setFormData({ ...formData, startTime: timeString });
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content event-form ${isProductDropdownOpen ? 'dropdown-open' : ''}`}>
        <div className="modal-header">
          <h3>
            {isEditing ? 'Edit Event' : (isQuickAdd ? 'Quick Add Event (Current Time)' : 'Create Event')}
            {isQuickAdd && <span className="quick-add-badge">NOW</span>}
            {isActiveEvent && <span className="active-event-badge" style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '8px' }}>ACTIVE</span>}
            {isEndedEvent && <span className="ended-event-badge" style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '8px' }}>ENDED</span>}
          </h3>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>


        <form onSubmit={handleSubmit} className="event-form-content">

          {/* Event Status Display for Active Events */}
          {isActiveEvent && event?.actualStartTime && (
            <div className="event-info-display" style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#16a34a', fontSize: '14px' }}>Active Event</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                <div>
                  <strong>Started:</strong> {event.actualStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Duration:</strong> {(() => {
                    const currentTime = new Date();
                    const scheduledStart = new Date(event.startDate);
                    const [hours, minutes] = event.startTime.split(':').map(Number);
                    scheduledStart.setHours(hours, minutes, 0, 0);
                    
                    // Only calculate duration if the event has actually started (current time >= scheduled start)
                    if (currentTime >= scheduledStart) {
                      const duration = (currentTime.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60);
                      return formatDuration(duration);
                    } else {
                      return "Not started yet";
                    }
                  })()}
                </div>
                <div>
                  <strong>Status:</strong> <span style={{ color: '#16a34a' }}>Active</span>
                </div>
                <div>
                  <strong>Action:</strong> <span style={{ color: '#16a34a' }}>Ready to End</span>
                </div>
              </div>
            </div>
          )}

          {/* Event Status Display for Ended Events */}
          {isEndedEvent && event?.actualStartTime && event?.actualEndTime && (
            <div className="event-info-display" style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '12px'
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#6b7280', fontSize: '14px' }}>Event Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                <div>
                  <strong>Started:</strong> {event.actualStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Ended:</strong> {event.actualEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Duration:</strong> {formatDuration((event.actualEndTime.getTime() - event.actualStartTime.getTime()) / (1000 * 60 * 60))}
                </div>
                <div>
                  <strong>Status:</strong> <span style={{ color: '#dc2626' }}>Ended</span>
                </div>
              </div>
            </div>
          )}

          {/* Read-only notice for ended events */}
          {isEndedEvent && (
            <div className="read-only-notice" style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              color: '#991b1b',
              fontSize: '14px'
            }}>
              <strong>⚠️ This event has ended and cannot be modified.</strong> All fields are disabled to preserve the historical record.
            </div>
          )}

          {/* Seat and Guest Count in one row */}
          <div className="seat-guest-row">
            <div className="form-group">
              <label htmlFor="resourceId">Seat *</label>
              <select
                id="resourceId"
                value={formData.resourceId}
                onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                className={validationErrors.resourceId ? 'error' : ''}
                disabled={!canModifyEvent ? true : false}
              >
                <option value="">Select a seat</option>
                {((): typeof resources => {
                  const base = resources;
                  if (!isCustomerBooking) return base;
                  const originalVenueServiceId = extractVenueServiceIdFromResourceId(event?.resourceId);
                  if (!originalVenueServiceId) return base;
                  const filtered = base.filter(r => r.venueServiceId === originalVenueServiceId);
                  return filtered.length > 0 ? filtered : base;
                })()
                  .map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.service}) - {resource.price} GEL/hour
                  </option>
                ))}
              </select>
              {validationErrors.resourceId && <span className="error-message">{validationErrors.resourceId}</span>}
            </div>

            {/* Guest Count Input for Guest-wise Pricing Services */}
            {(() => {
              const selectedResource = resources.find(r => r.id === formData.resourceId);
              const venueService = venueServices.find(vs => vs.id === selectedResource?.venueServiceId);
              
              if (!selectedResource || !venueService) return null;
              
              const service = venueService.services;
              const isGuestWise = service ? isGuestWiseService(service.pricing_model) : false;
              
              if (isGuestWise || formData.eventType === 'booking') {
                const guestLabel = service ? getGuestLabel(service, t('pricing.guest'), currentLanguage) : t('pricing.guest');
                
                return (
                  <div className="form-group">
                    <label htmlFor="guestCount">Number of {guestLabel}s *</label>
                    <input
                      type="number"
                      id="guestCount"
                      min="1"
                      max="20"
                      value={formData.guestCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, guestCount: value });
                      }}
                      className={validationErrors.guestCount ? 'error' : ''}
                      disabled={!canModifyEvent || isCustomerBooking}
                    />
                    {validationErrors.guestCount && <span className="error-message">{validationErrors.guestCount}</span>}
                  </div>
                );
              }
              return null;
            })()}
          </div>


          <div className="time-inputs">
            <div className="form-group">
              <label>Start Time *</label>
              <div className="time-picker">
                <select
                  value={selectedTime.hour}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value), selectedTime.minute)}
                  className={validationErrors.startTime ? 'error' : ''}
                  disabled={!canModifyEvent || isCustomerBooking}
                >
                  {hourOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                
                <span className="time-separator">:</span>
                
                <select
                  value={selectedTime.minute}
                  onChange={(e) => handleTimeChange(selectedTime.hour, parseInt(e.target.value))}
                  className={validationErrors.startTime ? 'error' : ''}
                  disabled={!canModifyEvent || isCustomerBooking}
                >
                  {minuteOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {validationErrors.startTime && <span className="error-message">{validationErrors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (hours) *</label>
              <div className="duration-row">
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
                  className={validationErrors.duration ? 'error' : ''}
                  disabled={formData.isOpenDuration || !canModifyEvent || isCustomerBooking}
                >
                  {(() => {
                    const stepHrs = settings.durationStepMinutes / 60;
                    const values: number[] = [];
                    
                    // Generate duration options without restrictions - show all available durations
                    // Cap at 24 hours maximum for practical purposes
                    const max = 24;
                    for (let v = stepHrs; v <= max + 1e-9; v += stepHrs) {
                      const rounded = Math.round(v * 100) / 100;
                      values.push(rounded);
                    }
                    
                    return values.map(v => (
                      <option key={v} value={v}>
                        {v < 1 ? `${Math.round(v * 60)} minutes` : `${v} hour${v >= 2 ? 's' : ''}`}
                      </option>
                    ));
                  })()}
                </select>
                <label className="checkbox-label-inline">
                  <input
                    type="checkbox"
                    checked={formData.isOpenDuration}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      isOpenDuration: e.target.checked,
                      duration: e.target.checked ? 0 : formData.duration
                    })}
                    className="duration-checkbox"
                    disabled={isEndedEvent || !canModifyEvent || isCustomerBooking}
                  />
                  <span className="checkbox-text">
                    <strong>Open Duration</strong>
                    {isActiveEvent && <span className="active-event-note" style={{ color: '#16a34a', fontSize: '12px' }}> (Event is currently active)</span>}
                    {isEndedEvent && <span className="ended-event-note" style={{ color: '#dc2626', fontSize: '12px' }}> (Event Ended)</span>}
                    {!isActiveEvent && !isEndedEvent && formData.isOpenDuration && <span className="scheduled-event-note" style={{ color: '#6b7280', fontSize: '12px' }}> (Will start at scheduled time)</span>}
                  </span>
                </label>
              </div>
              {validationErrors.duration && <span className="error-message">{validationErrors.duration}</span>}
            </div>
          </div>


            <div className="form-group">
            <label htmlFor="color">Color</label>
            <div className="color-picker">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    disabled={isCustomerBooking}
                />
              ))}
            </div>
          </div>

          {/* Products selection (searchable + selected list) */}
          <div className="form-group">
            <label>Products</label>
            
            {/* Stock warnings */}
            {(() => {
              const selectedProductsWithStock = Object.entries(productQuantities)
                .filter(([, q]) => q > 0)
                .map(([productId, qty]) => {
                  const prod = availableProducts.find(p => p.id === productId);
                  const maxStock = prod?.stock_quantity ?? Infinity;
                  return { productId, qty, maxStock, name: prod?.name || 'Unknown' };
                })
                .filter(p => p.maxStock !== Infinity);
              
              const exceededProducts = selectedProductsWithStock.filter(p => p.qty > p.maxStock);
              
              if (exceededProducts.length > 0) {
                return (
                  <div style={{
                    padding: '12px',
                    marginBottom: '12px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#991b1b'
                  }}>
                    <strong>⚠️ Stock Exceeded:</strong> Some products exceed available stock. Please adjust quantities.
                  </div>
                );
              }
              
              return null;
            })()}
            
            <div className="product-picker">
              <div className="product-search">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  disabled={!canModifyEvent}
                />
                {isProductDropdownOpen && catalogToShow.length > 0 && (
                  <div className="product-dropdown" role="listbox" aria-label="Product results">
                    {catalogToShow.map((p) => {
                      const stockStatus = getProductStockStatus(p.id, 1);
                      const isOutOfStock = !stockStatus.inStock || stockStatus.available === 0;
                      
                      return (
                        <button
                          type="button"
                          key={p.id}
                          className={`product-option ${isOutOfStock ? 'out-of-stock' : ''}`}
                          onClick={() => {
                            if (!isOutOfStock) {
                              setProductQuantities(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
                              setProductSearch('');
                              setIsProductDropdownOpen(false);
                            }
                          }}
                          title={isOutOfStock ? `Cannot add: ${stockStatus.message}` : (p.price !== undefined ? `${p.name} — ${p.price.toFixed(2)} GEL` : p.name)}
                          disabled={!canModifyEvent || isOutOfStock}
                          style={isOutOfStock ? { 
                            opacity: 0.6, 
                            cursor: 'not-allowed',
                            backgroundColor: '#fef2f2'
                          } : {}}
                        >
                          <span className="option-name">
                            {p.name}
                            {isOutOfStock && (
                              <span style={{ 
                                marginLeft: '8px', 
                                fontSize: '11px', 
                                color: '#dc2626',
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5'
                              }}>
                                ❌ {stockStatus.message}
                              </span>
                            )}
                          </span>
                          {p.price !== undefined && <span className="option-price" style={isOutOfStock ? { color: '#9ca3af' } : {}}>{p.price.toFixed(2)} GEL</span>}
                          {!isOutOfStock && <span className="option-add">Add</span>}
                          {isOutOfStock && (
                            <span style={{
                              fontSize: '11px',
                              color: '#991b1b',
                              fontWeight: 600,
                              fontStyle: 'italic'
                            }}>
                              Cannot add
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="selected-products">
                {Object.entries(productQuantities).filter(([, q]) => q > 0).length === 0 && (
                  <div className="muted">No products selected</div>
                )}
                {Object.entries(productQuantities)
                  .filter(([, q]) => q > 0)
                  .map(([productId, qty]) => {
                    const prod = availableProducts.find(p => p.id === productId);
                    const name = prod?.name || productId;
                    const stockStatus = getProductStockStatus(productId, 0);
                    const maxStock = prod?.stock_quantity ?? Infinity;
                    const canAddMore = qty < maxStock;
                    
                    return (
                      <div key={productId} className="selected-product-row">
                        <div className="sp-info">
                          <span className="sp-name">
                            {name}
                            {!canAddMore && maxStock !== Infinity && (
                              <span style={{ 
                                marginLeft: '8px', 
                                fontSize: '11px', 
                                color: '#dc2626',
                                fontWeight: 600,
                                backgroundColor: '#fee2e2',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                Max stock reached
                              </span>
                            )}
                          </span>
                          {prod?.price !== undefined && (
                            <span className="sp-price">{prod.price.toFixed(2)} GEL</span>
                          )}
                        </div>
                        <div className="sp-actions">
                          <button 
                            type="button" 
                            className="qty-btn" 
                            onClick={() => setProductQuantities(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }))} 
                            disabled={!canModifyEvent}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={maxStock !== Infinity ? maxStock : undefined}
                            step={1}
                            value={qty}
                            onChange={(e) => {
                              const value = Math.max(0, Number(e.target.value) || 0);
                              const limited = maxStock !== Infinity ? Math.min(value, maxStock) : value;
                              setProductQuantities((prev) => ({ ...prev, [productId]: limited }));
                            }}
                            disabled={!canModifyEvent}
                          />
                          <button 
                            type="button" 
                            className="qty-btn" 
                            onClick={() => {
                              if (canAddMore) {
                                setProductQuantities(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
                              }
                            }} 
                            disabled={!canModifyEvent || !canAddMore}
                            title={!canAddMore ? 'Cannot add more - out of stock' : 'Increase quantity'}
                            style={!canAddMore ? { 
                              opacity: 0.5, 
                              cursor: 'not-allowed',
                              backgroundColor: '#fee2e2'
                            } : {}}
                          >
                            +
                          </button>
                          <button 
                            type="button" 
                            className="remove-btn" 
                            onClick={() => setProductQuantities(prev => ({ ...prev, [productId]: 0 }))} 
                            disabled={!canModifyEvent}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label htmlFor="paymentMethod">
              <CreditCard size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Payment Method (optional)
            </label>
            <select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={validationErrors.paymentMethod ? 'error' : ''}
              disabled={!canModifyEvent}
            >
              <option value="">Select payment method</option>
              <option value="card">
                💳 Card
              </option>
              <option value="cash">
                💵 Cash
              </option>
            </select>
            {validationErrors.paymentMethod && <span className="error-message">{validationErrors.paymentMethod}</span>}
          </div>

          {/* Price Summary at Bottom */}
          {formData.resourceId && (
            <div className="price-summary">
              {(() => {
                const selectedResource = resources.find(r => r.id === formData.resourceId);
                const venueService = venueServices.find(vs => vs.id === selectedResource?.venueServiceId);
                
                if (selectedResource && venueService) {
                  const service = venueService.services;
                  const guestCount = formData.guestCount || 1;
                  const duration = formData.duration || 1;
                  
                  // Calculate service price (only for fixed duration events)
                  let servicePrice = 0;
                  if (!formData.isOpenDuration) {
                    const serviceWithPricing = {
                      ...venueService,
                      pricing_model: service?.pricing_model,
                      guest_pricing_rules: venueService.guest_pricing_rules
                    };
                    servicePrice = calculateGuestPrice(serviceWithPricing, guestCount, 1, duration) || 0;
                  }
                  
                  // Calculate product prices
                  const productPrices = Object.entries(productQuantities)
                    .filter(([, qty]) => typeof qty === 'number' && qty > 0)
                    .reduce((total, [productId, qty]) => {
                      const product = availableProducts.find(p => p.id === productId);
                      return total + ((product?.price || 0) * qty);
                    }, 0);
                  
                  const totalPrice = servicePrice + productPrices;
                  
                  // For customer bookings, show different pricing display
                  if (isCustomerBooking) {
                    const selectedProductsWithPrices = Object.entries(productQuantities)
                      .filter(([, qty]) => typeof qty === 'number' && qty > 0)
                      .map(([productId, qty]) => {
                        const product = availableProducts.find(p => p.id === productId);
                        return {
                          id: productId,
                          name: product?.name || 'Unknown',
                          price: product?.price || 0,
                          quantity: qty,
                          total: (product?.price || 0) * qty
                        };
                      });
                    
                    return (
                      <div className="price-summary-content">
                        <div className="price-summary-header">
                          <h4>Price Summary</h4>
                        </div>
                        
                        <div className="price-summary-items">
                          <div className="price-summary-item">
                            <span className="price-label">Service</span>
                            <span className="price-value" style={{ color: '#10b981', fontWeight: 600 }}>
                              Already Paid
                            </span>
                          </div>
                          
                          {selectedProductsWithPrices.map(product => (
                            <div key={product.id} className="price-summary-item">
                              <span className="price-label">{product.name} × {product.quantity}</span>
                              <span className="price-value">{product.total.toFixed(2)} GEL</span>
                            </div>
                          ))}
                        </div>
                        
                        {selectedProductsWithPrices.length > 0 && (
                          <div className="price-summary-total">
                            <span className="total-label">Products Total</span>
                            <span className="total-value">
                              {productPrices.toFixed(2)} GEL
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // For employee events, show normal pricing
                  return (
                    <div className="price-summary-content">
                      <div className="price-summary-header">
                        <h4>Price Summary</h4>
                      </div>
                      
                      <div className="price-summary-items">
                        <div className="price-summary-item">
                          <span className="price-label">
                            {(() => {
                              if (formData.isOpenDuration) {
                                return 'Service (open)';
                              }
                              const d = formData.duration || 0;
                              let hours = Math.floor(d);
                              let minutes = Math.round((d - hours) * 60);
                              if (minutes === 60) { hours += 1; minutes = 0; }
                              const parts: string[] = [];
                              if (hours > 0) parts.push(`${hours}h`);
                              if (minutes > 0) parts.push(`${minutes}m`);
                              const pretty = parts.length > 0 ? parts.join(' ') : '0m';
                              return `Service (${pretty})`;
                            })()}
                          </span>
                          <span className="price-value">
                            {formData.isOpenDuration 
                              ? 'Calculated when ended' 
                              : `${servicePrice.toFixed(2)} GEL`
                            }
                          </span>
                        </div>
                        
                        {productPrices > 0 && (
                          <div className="price-summary-item">
                            <span className="price-label">Products</span>
                            <span className="price-value">{productPrices.toFixed(2)} GEL</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="price-summary-total">
                        <span className="total-label">Total</span>
                        <span className="total-value">
                          {formData.isOpenDuration 
                            ? 'Calculated when ended' 
                            : `${totalPrice.toFixed(2)} GEL`
                          }
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="secondary-button">
              Cancel
            </button>
            {event?.eventType === 'employee' && !isEndedEvent && (
              <button 
                type="button" 
                onClick={handleEndEvent} 
                className="end-event-button"
                style={{ 
                  backgroundColor: '#ef4444', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Square size={16} />
                End Event
              </button>
            )}
            <button 
              type="submit" 
              className="primary-button"
              disabled={isEditing && !canModifyEvent}
            >
              {isEditing ? 'Update' : 'Create'} Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
