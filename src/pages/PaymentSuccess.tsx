import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analyticsEvents } from '@/lib/analytics';

interface BookingDetails {
  id: string;
  venue_name: string;
  booking_date: string;
  arrival_time: string;
  departure_time: string;
  guest_count: number;
  total_amount: number;
  status: string;
  venue_location?: string;
  special_requests?: string;
}

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);

  const orderId = searchParams.get('order_id');
  const bookingId = searchParams.get('booking_id');
  const isMockPayment = searchParams.get('mock_payment') === 'true';

  useEffect(() => {
    const verifyPaymentAndFetchBooking = async () => {
      console.log('🔧 PaymentSuccess Debug:', {
        user: !!user,
        userEmail: user?.email,
        isMockPayment,
        orderId,
        bookingId,
        currentUrl: window.location.href,
        searchParams: window.location.search,
        mockPaymentParam: searchParams.get('mock_payment')
      });
      
      // For guest users with mock payments, we don't require authentication
      // For authenticated users, we require authentication
      if (!user && !isMockPayment) {
        console.log('🔧 Redirecting to auth - no user and not mock payment');
        // Preserve the full current URL including query parameters
        const currentUrl = window.location.pathname + window.location.search;
        navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }
      
      // For guest users with mock payments, we can proceed without authentication
      if (!user && isMockPayment) {
        console.log('🔧 Processing guest mock payment confirmation - proceeding without auth');
        // Continue with guest payment processing below
      }

      try {
        // If we have a booking ID, fetch the booking details
        if (bookingId) {
          // For guest users, query by booking ID and email; for authenticated users, query by user ID
          let query = supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              status,
              special_requests,
              total_price,
              user_email,
              venues:venue_id (
                name,
                location
              )
            `)
            .eq('id', bookingId);
          
          if (user) {
            // Authenticated user - query by user_id
            query = query.eq('user_id', user.id);
          } else {
            // Guest user - query by email
            const guestEmail = localStorage.getItem('guestEmail');
            if (!guestEmail) {
              throw new Error('Guest email not found');
            }
            query = query.eq('user_email', guestEmail).is('user_id', null);
          }
          
          const { data: bookingData, error: bookingError } = await query.single();

          if (bookingError) {
            console.error('Error fetching booking:', bookingError);
            toast({
              title: "Error",
              description: "Could not fetch booking details",
              variant: "destructive",
            });
          } else if (bookingData) {
            setBooking({
              id: bookingData.id,
              booking_date: bookingData.booking_date,
              status: bookingData.status,
              special_requests: bookingData.special_requests,
              venue_name: bookingData.venues?.name,
              venue_location: bookingData.venues?.location,
              // The following may be undefined in this lightweight view
              arrival_time: (bookingData as any).arrival_time,
              departure_time: (bookingData as any).departure_time,
              guest_count: (bookingData as any).guest_count,
              total_amount: bookingData.total_price,
            });

            // Track successful booking
            analyticsEvents.bookingCompleted(
              bookingData.id,
              bookingData.total_price,
              t('booking.currency')
            );
          }
        }

        // If we have an order ID but no booking yet, wait for callback processing
        if (orderId && !bookingId) {
          if (isMockPayment) {
            // Handle mock payment confirmation
            try {
              // Use guest version if no user is authenticated
              const functionName = user ? 'mock-payment-confirm' : 'mock-payment-confirm-guest';
              const body = user 
                ? { orderId, mock: true }
                : { orderId, mock: true, guestEmail: localStorage.getItem('guestEmail') || '' };
              
              const { data, error } = await supabase.functions.invoke(functionName, {
                body
              });

              if (error) {
                console.error('Mock payment confirmation error:', error);
                toast({
                  title: "Mock Payment Error",
                  description: "Failed to confirm mock payment",
                  variant: "destructive",
                });
                setVerifying(false);
                return;
              }

              if (data?.success && data?.bookingId) {
                // Redirect to this page with booking ID, preserving mock_payment parameter
                const mockParam = isMockPayment ? '&mock_payment=true' : '';
                navigate(`/payment/success?booking_id=${data.bookingId}${mockParam}`, { replace: true });
                return;
              }
            } catch (mockError) {
              console.error('Mock payment confirmation failed:', mockError);
              toast({
                title: "Mock Payment Error",
                description: "Failed to confirm mock payment",
                variant: "destructive",
              });
            }
          } else {
            // Poll for booking creation (callback might still be processing)
            let attempts = 0;
            const maxAttempts = 10;
            
            const pollForBooking = async () => {
              attempts++;
              
              // For guest users, query by email; for authenticated users, query by user_id
              let query = supabase
                .from('bookings')
                .select('id, venue_name, total_amount, status')
                .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (user) {
                query = query.eq('user_id', user.id);
              } else {
                const guestEmail = localStorage.getItem('guestEmail');
                if (!guestEmail) {
                  throw new Error('Guest email not found');
                }
                query = query.eq('user_email', guestEmail).is('user_id', null);
              }
              
              const { data: recentBookings, error } = await query;

              if (!error && recentBookings && recentBookings.length > 0) {
                const recentBooking = recentBookings[0];
                if (recentBooking.status === 'confirmed') {
                  // Redirect to this page with booking ID, preserving mock_payment parameter
                  const mockParam = isMockPayment ? '&mock_payment=true' : '';
                  navigate(`/payment/success?booking_id=${recentBooking.id}${mockParam}`, { replace: true });
                  return;
                }
              }

              if (attempts < maxAttempts) {
                setTimeout(pollForBooking, 2000); // Try again in 2 seconds
              } else {
                setVerifying(false);
                toast({
                  title: "Payment Processing",
                  description: "Your payment is being processed. Check your booking history in a few minutes.",
                });
              }
            };

            pollForBooking();
          }
        } else {
          setVerifying(false);
        }

      } catch (error) {
        console.error('Error verifying payment:', error);
        setVerifying(false);
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your payment status",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPaymentAndFetchBooking();
  }, [user, orderId, bookingId, navigate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not specified';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">
            {verifying ? "Verifying payment..." : "Loading booking details..."}
          </h2>
          <p className="text-muted-foreground">Please wait while we confirm your booking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
              <p className="text-muted-foreground">Your booking has been confirmed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {booking ? (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-green-800">Booking Confirmed!</h2>
                    <p className="text-green-700">
                      Your payment has been processed successfully and your booking is confirmed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{booking.venue_name}</p>
                        {booking.venue_location && (
                          <p className="text-sm text-muted-foreground">{booking.venue_location}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{formatDate(booking.booking_date)}</p>
                        <p className="text-sm text-muted-foreground">Booking date</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {formatTime(booking.arrival_time)} - {formatTime(booking.departure_time)}
                        </p>
                        <p className="text-sm text-muted-foreground">Time slot</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{booking.guest_count} guests</p>
                        <p className="text-sm text-muted-foreground">Party size</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium">Booking ID</p>
                      <p className="text-sm text-muted-foreground font-mono">{booking.id}</p>
                    </div>

                    <div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status === 'confirmed' ? 'Confirmed' : booking.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {booking.special_requests && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Comment</p>
                      <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
                    </div>
                  </>
                )}

                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Paid</span>
                  <span className="text-lg font-bold text-primary">{booking.total_amount.toFixed(2)} {t('booking.currency')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/booking-history')}
                className="flex-1"
              >
                View All Bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>
          </div>
        ) : (
          /* Fallback when no booking details */
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground">
                Your payment has been processed. Please check your booking history for details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Button 
                onClick={() => navigate('/booking-history')}
                className="flex-1"
              >
                View Bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
