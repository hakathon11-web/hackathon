import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/pages/employee/calendar/types';

// Helper to robustly extract bookingId from eventId
// Supports both formats:
// - employee-{bookingId}-service-{bookingServiceId}-table-{seatNumber}
// - employee-{bookingId}
function extractBookingIdFromEventId(eventId: string): string {
  const match = eventId.match(/^employee-([a-f0-9-]+)(?:-service|$)/);
  if (!match || !match[1]) {
    throw new Error('Invalid event ID format.');
  }
  return match[1];
}

export interface EmployeeEventData {
  resourceId: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  duration: number;
  guestCount?: number;
  totalPrice?: number;
  serviceName?: string;
  pricePerHour?: number;
  subtotal?: number;
  pricingModel?: string;
  eventType: 'employee';
  color?: string;
  isOpenDuration?: boolean;
  actualStartTime?: Date;
  actualEndTime?: Date;
  eventStatus?: 'active' | 'ended';
  products?: Array<{ productId: string; quantity: number }>;
  specialRequests?: string;
  paymentMethod?: string;
}

export interface EmployeeBooking {
  id: string;
  venue_id: string;
  employee_id: string;
  event_type: 'employee';
  booking_date: string;
  total_price: number;
  status: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  booking_services: Array<{
    id: string;
    service_id: string;
    arrival_datetime: string;
    departure_datetime: string;
    guest_count: number;
    price_per_hour: number;
    duration_hours: number;
    subtotal: number;
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
  }>;
}

export const useCreateEmployeeEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventData, employeeId, venueId, venueServiceId }: {
      eventData: EmployeeEventData;
      employeeId: string;
      venueId: string;
      venueServiceId: string;
    }) => {
      // Validate required UUID fields before database insertion
      if (!employeeId || employeeId === '') {
        throw new Error('Employee ID is required but was empty or undefined');
      }
      if (!venueId || venueId === '') {
        throw new Error('Venue ID is required but was empty or undefined');
      }
      if (!venueServiceId || venueServiceId === '') {
        throw new Error('Venue Service ID is required but was empty or undefined');
      }

      // Calculate arrival datetime
      const arrivalDateTime = new Date(eventData.startDate);
      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      arrivalDateTime.setHours(hours, minutes, 0, 0);

      // Create booking record via RPC to avoid uuid cast issues in RLS
      const { data: booking, error: bookingError } = await supabase.rpc('create_employee_booking', {
        p_employee_id: employeeId as any,
        p_venue_id: venueId as any,
        p_venue_service_id: venueServiceId as any,
        p_booking_date: eventData.startDate.toISOString().split('T')[0] as any,
        p_total_price: (eventData.totalPrice || 0) as any,
        p_color: (eventData.color || '#3b82f6') as any,
        p_is_open_duration: (eventData.isOpenDuration || false) as any,
        p_event_status: (eventData.eventStatus || null) as any,
        p_special_requests: (eventData.specialRequests || null) as any,
        p_payment_method: (eventData.paymentMethod || null) as any
      });

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      // For open duration events, departure datetime should be NULL until manually ended
      // For fixed duration events, calculate the departure datetime
      const departureDateTime = eventData.isOpenDuration 
        ? null 
        : new Date(arrivalDateTime.getTime() + (eventData.duration * 60 * 60 * 1000));

      // Extract seat number from resourceId (format: venue-{venueServiceId}-seat-{seatNumber})
      const resourceIdParts = eventData.resourceId.split('-');
      const seatNumber = parseInt(resourceIdParts[resourceIdParts.length - 1]) || 1;
      

      // Create booking service record with proper table configuration
      const tableConfigurations = [{
        table_number: seatNumber,
        guest_count: eventData.guestCount || 1
      }];

      // Add back all the required fields
      const bookingServiceData = {
        booking_id: (booking as any).id,
        service_id: venueServiceId,
        arrival_datetime: arrivalDateTime.toISOString(),
        departure_datetime: departureDateTime?.toISOString() || null,
        guest_count: eventData.guestCount || 1,
        price_per_hour: eventData.pricePerHour || 0,
        duration_hours: eventData.isOpenDuration ? null : eventData.duration,
        subtotal: eventData.subtotal || eventData.totalPrice || 0,
        table_configurations: tableConfigurations,
      };


      const { data: bookingService, error: serviceError } = await supabase.rpc('create_employee_booking_service', {
        p_booking_id: (booking as any).id as any,
        p_service_id: venueServiceId as any,
        p_arrival_datetime: arrivalDateTime.toISOString() as any,
        p_departure_datetime: (departureDateTime ? departureDateTime.toISOString() : null) as any,
        p_guest_count: (eventData.guestCount || 1) as any,
        p_price_per_hour: (eventData.pricePerHour || 0) as any,
        p_duration_hours: (eventData.isOpenDuration ? null : eventData.duration) as any,
        p_subtotal: (eventData.subtotal || eventData.totalPrice || 0) as any,
        p_table_configurations: tableConfigurations as any,
      });

      if (serviceError) {
        console.error('Booking service creation error:', serviceError);
        // Clean up the booking if service creation fails
        await supabase.from('bookings').delete().eq('id' as any, (booking as any).id as any);
        throw new Error(`Failed to create booking service: ${serviceError.message}`);
      }

      // Insert products if any
      if (eventData.products && eventData.products.length > 0) {
        // Fetch product details to get current prices
        const productIds = eventData.products.map(p => p.productId);
        const { data: products, error: productsFetchError } = await supabase
          .from('venue_products')
          .select('id, price')
          .in('id', productIds as any);

        if (productsFetchError) {
          console.error('Error fetching product details:', productsFetchError);
          // Clean up the booking and booking service
          await supabase.from('booking_services').delete().eq('id' as any, (bookingService as any).id as any);
          await supabase.from('bookings').delete().eq('id' as any, (booking as any).id as any);
          throw new Error(`Failed to fetch product details: ${productsFetchError.message}`);
        }

        const productInserts = eventData.products.map(product => {
          // Find the product details to get current price
          const productDetails = (products as any)?.find((p: any) => p.id === product.productId);
          const unitPrice = productDetails?.price || 0;
          const totalPrice = unitPrice * product.quantity;
          
          return {
            booking_id: (booking as any).id,
            product_id: product.productId,
            quantity: product.quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          };
        });

        const { error: productsError } = await supabase
          .from('booking_products')
          .insert(productInserts as any);

        if (productsError) {
          console.error('Booking products creation error:', productsError);
          // Clean up the booking and booking service if products creation fails
          await supabase.from('booking_services').delete().eq('id' as any, (bookingService as any).id as any);
          await supabase.from('bookings').delete().eq('id' as any, (booking as any).id as any);
          throw new Error(`Failed to create booking products: ${productsError.message}`);
        }

        // Update product stock quantities (decrease stock when products are added to events)
        for (const product of eventData.products) {
          const { error: stockUpdateError } = await supabase.rpc('decrease_product_stock', {
            product_id: product.productId,
            quantity: product.quantity
          });

          if (stockUpdateError) {
            console.warn('Failed to update product stock:', stockUpdateError);
            // Don't throw error here as the booking was created successfully
          }
        }
      }

      const serviceIdForEvent = (bookingService as any)?.id || 'unknown';

      return {
        booking,
        bookingService,
        eventId: `employee-${(booking as any).id}-service-${serviceIdForEvent}-table-${seatNumber}`,
      };
    },
    onSuccess: () => {
      toast({
        title: "Event Created",
        description: "Employee event has been saved successfully.",
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-bookings'] });
    },
    onError: (error) => {
      console.error('Employee event creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create employee event.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateEmployeeEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, eventData, venueServiceId }: {
      eventId: string;
      eventData: EmployeeEventData;
      venueServiceId: string;
    }) => {
      console.log('Updating employee event:', { eventId, eventData });

      // Extract booking ID from event ID
      const bookingId = extractBookingIdFromEventId(eventId);

      // Update booking record
      const { data: booking, error: bookingError } = await supabase.rpc('update_employee_booking', {
        p_booking_id: bookingId as any,
        p_booking_date: eventData.startDate.toISOString().split('T')[0] as any,
        p_total_price: (eventData.totalPrice || 0) as any,
        p_special_requests: (eventData.specialRequests || null) as any,
        p_color: (eventData.color || '#3b82f6') as any,
        p_is_open_duration: ((eventData.eventStatus === 'ended') ? false : (eventData.isOpenDuration || false)) as any,
        p_event_status: (eventData.eventStatus || null) as any,
        p_actual_start_time: null as any,
        p_actual_end_time: (eventData.actualEndTime ? eventData.actualEndTime.toISOString() : null) as any,
        p_payment_method: (eventData.paymentMethod || null) as any,
      });

      if (bookingError) {
        console.error('Booking update error:', bookingError);
        throw new Error(`Failed to update booking: ${bookingError.message}`);
      }

      // Calculate new arrival datetime
      const arrivalDateTime = new Date(eventData.startDate);
      const [hours, minutes] = eventData.startTime.split(':').map(Number);
      arrivalDateTime.setHours(hours, minutes, 0, 0);

      // Determine departure datetime and duration
      let departureDateTime: Date | null;
      let computedDurationHours: number | null;
      if (eventData.eventStatus === 'ended' && eventData.actualEndTime) {
        // Ended open-duration: compute actuals from arrival -> actualEndTime
        departureDateTime = new Date(eventData.actualEndTime);
        const durationMs = departureDateTime.getTime() - arrivalDateTime.getTime();
        computedDurationHours = Math.max(0, durationMs / (1000 * 60 * 60));
      } else {
        departureDateTime = eventData.isOpenDuration
          ? null
          : new Date(arrivalDateTime.getTime() + (eventData.duration * 60 * 60 * 1000));
        computedDurationHours = eventData.isOpenDuration ? null : eventData.duration;
      }

      // Extract seat number from resourceId for update
      const resourceIdParts = eventData.resourceId.split('-');
      const seatNumber = parseInt(resourceIdParts[resourceIdParts.length - 1]) || 1;
      
      // Create proper table configuration for update
      const tableConfigurations = [{
        table_number: seatNumber,
        guest_count: eventData.guestCount || 1
      }];

      const { data: bookingService, error: serviceError } = await supabase.rpc('update_employee_booking_service', {
        p_booking_id: bookingId as any,
        p_arrival_datetime: arrivalDateTime.toISOString() as any,
        p_departure_datetime: (departureDateTime ? departureDateTime.toISOString() : null) as any,
        p_guest_count: (eventData.guestCount || 1) as any,
        p_price_per_hour: (eventData.pricePerHour || 0) as any,
        p_duration_hours: computedDurationHours as any,
        p_subtotal: (eventData.subtotal || eventData.totalPrice || 0) as any,
        p_table_configurations: tableConfigurations as any,
      });

      if (serviceError) {
        console.error('Booking service update error:', serviceError);
        throw new Error(`Failed to update booking service: ${serviceError.message}`);
      }

      // Handle products update - delete existing and insert new ones
      // First, get existing booking products to restore stock
      const { data: existingProducts, error: fetchExistingError } = await supabase
        .from('booking_products')
        .select('product_id, quantity')
        .eq('booking_id' as any, bookingId as any);

      if (fetchExistingError) {
        console.error('Error fetching existing booking products:', fetchExistingError);
        throw new Error(`Failed to fetch existing booking products: ${fetchExistingError.message}`);
      }

      // Restore stock for existing products (increase stock when products are removed from events)
      if (existingProducts && existingProducts.length > 0) {
        for (const existingProduct of existingProducts as any[]) {
          const { error: stockRestoreError } = await supabase.rpc('increase_product_stock', {
            product_id: existingProduct.product_id,
            quantity: existingProduct.quantity
          });

          if (stockRestoreError) {
            console.warn('Failed to restore product stock:', stockRestoreError);
          }
        }
      }

      // Now delete existing booking products
      const { error: deleteProductsError } = await supabase
        .from('booking_products')
        .delete()
        .eq('booking_id' as any, bookingId as any);

      if (deleteProductsError) {
        console.error('Error deleting existing booking products:', deleteProductsError);
        throw new Error(`Failed to delete existing booking products: ${deleteProductsError.message}`);
      }

      // Insert new products if any
      if (eventData.products && eventData.products.length > 0) {
        // Fetch product details to get current prices
        const productIds = eventData.products.map(p => p.productId);
        const { data: products, error: productsFetchError } = await supabase
          .from('venue_products')
          .select('id, price')
          .in('id', productIds as any);

        if (productsFetchError) {
          console.error('Error fetching product details:', productsFetchError);
          throw new Error(`Failed to fetch product details: ${productsFetchError.message}`);
        }

        const productInserts = eventData.products.map(product => {
          // Find the product details to get current price
          const productDetails = (products as any)?.find((p: any) => p.id === product.productId);
          const unitPrice = productDetails?.price || 0;
          const totalPrice = unitPrice * product.quantity;
          
          return {
            booking_id: bookingId,
            product_id: product.productId,
            quantity: product.quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          };
        });

        const { error: productsError } = await supabase
          .from('booking_products')
          .insert(productInserts as any);

        if (productsError) {
          console.error('Booking products update error:', productsError);
          throw new Error(`Failed to update booking products: ${productsError.message}`);
        }

        // Update product stock quantities (decrease stock when products are added to events)
        for (const product of eventData.products) {
          const { error: stockUpdateError } = await supabase.rpc('decrease_product_stock', {
            product_id: product.productId,
            quantity: product.quantity
          });

          if (stockUpdateError) {
            console.warn('Failed to update product stock:', stockUpdateError);
            // Don't throw error here as the booking was updated successfully
          }
        }
      }

      const serviceIdForEvent = (bookingService as any)?.id || 'unknown';

      return {
        booking,
        bookingService,
        eventId: `employee-${(booking as any).id}-service-${serviceIdForEvent}-table-${seatNumber}`,
      };
    },
    onSuccess: () => {
      toast({
        title: "Event Updated",
        description: "Employee event has been updated successfully.",
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-bookings'] });
    },
    onError: (error) => {
      console.error('Employee event update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee event.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteEmployeeEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      console.log('Deleting employee event:', eventId);

      // Extract booking ID from event ID
      const bookingId = extractBookingIdFromEventId(eventId);

      // First, get existing booking products to restore stock before deleting
      const { data: existingProducts, error: fetchExistingError } = await supabase
        .from('booking_products')
        .select('product_id, quantity')
        .eq('booking_id' as any, bookingId as any);
      
      if (fetchExistingError) {
        console.error('Error fetching existing booking products for deletion:', fetchExistingError);
        throw new Error(`Failed to fetch existing booking products: ${fetchExistingError.message}`);
      }

      // Restore stock for existing products (increase stock when products are removed from events)
      if (existingProducts && existingProducts.length > 0) {
        for (const existingProduct of existingProducts as any[]) {
          const { error: stockRestoreError } = await supabase.rpc('increase_product_stock', {
            product_id: existingProduct.product_id,
            quantity: existingProduct.quantity
          });

          if (stockRestoreError) {
            console.warn('Failed to restore product stock on deletion:', stockRestoreError);
          }
        }
      }

      // Now delete booking products (due to foreign key constraint)
      const { error: productsError } = await supabase
        .from('booking_products')
        .delete()
        .eq('booking_id' as any, bookingId as any);

      if (productsError) {
        console.error('Booking products deletion error:', productsError);
        throw new Error(`Failed to delete booking products: ${productsError.message}`);
      }

      // Delete booking services (due to foreign key constraint)
      const { error: serviceError } = await supabase
        .from('booking_services')
        .delete()
        .eq('booking_id' as any, bookingId as any);

      if (serviceError) {
        console.error('Booking service deletion error:', serviceError);
        throw new Error(`Failed to delete booking service: ${serviceError.message}`);
      }

      // Delete booking record
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .eq('id' as any, bookingId as any);

      if (bookingError) {
        console.error('Booking deletion error:', bookingError);
        throw new Error(`Failed to delete booking: ${bookingError.message}`);
      }

      return { eventId };
    },
    onSuccess: () => {
      toast({
        title: "Event Deleted",
        description: "Employee event has been deleted successfully.",
      });
      
      // Invalidate relevant queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-bookings'] });
    },
    onError: (error) => {
      console.error('Employee event deletion error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee event.",
        variant: "destructive",
      });
    },
  });
};
