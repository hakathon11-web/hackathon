import React, { useState } from 'react';
import { useEmployeePendingBookings } from '@/hooks/useEmployeePendingBookings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useServiceTranslation } from '@/utils/serviceTranslation';
import { Check, X, Clock, User, Users, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGuestLabel } from '@/utils/pricingLabels';

interface PendingBookingsPanelProps {
  venueId: string;
  onBookingApproved?: (bookingId: string) => void;
  onBookingRejected?: (bookingId: string) => void;
}

export function PendingBookingsPanel({ venueId, onBookingApproved, onBookingRejected }: PendingBookingsPanelProps) {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  const queryClient = useQueryClient();
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const currentLanguage = i18n.language as 'en' | 'ka';
  
  const { data: pendingBookings = [], isLoading, error } = useEmployeePendingBookings(venueId);

  const approveBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          status_updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: (_, bookingId) => {
      toast({
        title: "Booking Approved",
        description: "The booking has been confirmed.",
      });
      queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', venueId] });
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });
      onBookingApproved?.(bookingId);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve booking. Please try again.",
        variant: "destructive",
      });
      console.error('Error approving booking:', error);
    }
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'rejected',
          rejection_message: reason,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: (_, { bookingId }) => {
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['employee-pending-bookings', venueId] });
      queryClient.invalidateQueries({ queryKey: ['venue-calendar-data', venueId] });
      onBookingRejected?.(bookingId);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive",
      });
      console.error('Error rejecting booking:', error);
    }
  });

  const handleApprove = (bookingId: string) => {
    approveBookingMutation.mutate(bookingId);
  };

  const handleReject = (bookingId: string) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    if (reason !== null) { // User didn't cancel
      rejectBookingMutation.mutate({ bookingId, reason: reason || 'No reason provided' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (datetimeString: string) => {
    return new Date(datetimeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.max(0, 15 - Math.floor((now.getTime() - created.getTime()) / (1000 * 60))); // Assuming 15 min timeout
    return diffMinutes;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">
          Failed to load pending bookings. Please try again.
        </div>
      </div>
    );
  }

  if (pendingBookings.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No pending booking requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Bookings</h3>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {pendingBookings.length} pending
        </Badge>
      </div>

      <div className="space-y-3">
        {pendingBookings.map((booking) => {
          const timeRemaining = getTimeRemaining(booking.created_at);
          const isUrgent = timeRemaining <= 5;
          
          return (
            <Card key={booking.id} className={`${isUrgent ? 'border-orange-300 bg-orange-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {booking.user_email}
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDate(booking.booking_date)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={isUrgent ? "destructive" : "secondary"} className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {timeRemaining}m left
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApprove(booking.id)}
                        disabled={approveBookingMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(booking.id)}
                        disabled={rejectBookingMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {/* Booking Services */}
                  {booking.booking_services?.map((service, index) => (
                    <div key={service.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {service.venue_services?.services ? translateService({
                            name: service.venue_services.services.name,
                            name_en: service.venue_services.services.name_en,
                            name_ka: service.venue_services.services.name_ka
                          }) : 'Unknown Service'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatTime(service.arrival_datetime)} - {formatTime(service.departure_datetime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {service.guest_count} {getGuestLabel(service.venue_services, t('pricing.guest'), currentLanguage)}{service.guest_count > 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {service.subtotal.toFixed(2)} {t('booking.currency')}
                          </span>
                        </div>
                        <span className="text-xs">
                          {service.duration_hours}h duration
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total Price */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-lg">{booking.total_price.toFixed(2)} {t('booking.currency')}</span>
                  </div>
                  
                  {/* Special Requests */}
                  {booking.special_requests && (
                    <div className="mt-3 p-2 bg-gray-50 rounded">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="text-xs text-gray-600 font-medium">Comment:</span>
                          <p className="text-sm text-gray-700 mt-1">{booking.special_requests}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
