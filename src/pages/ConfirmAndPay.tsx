import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Star, MapPin, Users, Calendar, CreditCard, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVenue, useVenueServices } from "@/hooks/useVenues";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AuthDialog from "@/components/AuthDialog";
// Stripe removed
import SavedPaymentMethods from "@/components/SavedPaymentMethods";
import { SavedPaymentMethod } from "@/hooks/useSavedPaymentMethods";
import { isFrictionlessPaymentsEnabled } from "@/config/development";

// Stripe removed

// Enhanced Payment Form Component with One-time Payment Option
const PaymentForm = ({ bookingData, onSuccess, onError, disabled, useOneTimeFlow = false, isGuest = false, guestEmail = '' }: any) => {
  // Stripe removed
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SavedPaymentMethod | null>(null);
  const [useOneTimePayment, setUseOneTimePayment] = useState(useOneTimeFlow);

  useEffect(() => {
    // No pre-initialize intent required for BOG
  }, [bookingData, user]);

  const createBogOrder = async (paymentMethodId?: string) => {
    try {
      
      // Debug: Check if user has valid session
      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.error('User exists but no valid session found!');
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            // Force logout if refresh fails
            await supabase.auth.signOut();
            window.location.reload();
            return;
          }
        }
      }
      
      const endpoint = isGuest ? 'bog-create-order-guest' : 'bog-create-order';
      const payload: any = {
        amount: bookingData.discountedTotal || bookingData.totalPrice,
        bookingData: {
          venueId: bookingData.venueId,
          venueName: bookingData.venueName,
          date: bookingData.date,
          time: bookingData.arrivalTime,
          guests: bookingData.guests,
          serviceIds: bookingData.serviceIds,
          serviceBookings: bookingData.serviceBookings,
          specialRequests: bookingData.specialRequests,
        },
        locale: document.documentElement.lang || 'ka',
      };
      if (isGuest) payload.guestEmail = guestEmail;
      const { data, error } = await supabase.functions.invoke(endpoint, { body: payload });

      if (error) throw error;
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Missing redirect URL from payment provider');
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      const status = error?.status || error?.context?.status;
      if (status === 401 || /auth/i.test(error?.message || '')) {
        onError(t('auth.sessionExpired') || 'Your session expired. Please sign in again.');
        return;
      }
      onError(error.message || 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsProcessing(true);

    try {
      await createBogOrder(selectedPaymentMethod?.stripe_payment_method_id);
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Payment failed';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Provide more specific error messages for common issues
      if (errorMessage.includes('Payment not completed')) {
        errorMessage = 'Payment was not completed successfully. Please try again.';
      } else if (errorMessage.includes('Payment intent')) {
        errorMessage = 'There was an issue with the payment. Please try again.';
      } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
        errorMessage = 'Server error occurred. Please try again in a moment.';
      }
      
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentMethodSelect = (paymentMethod: SavedPaymentMethod | null) => {
    setSelectedPaymentMethod(paymentMethod);
    setUseOneTimePayment(false);
    // Create new payment intent with the selected payment method
    if (paymentMethod) {
      createPaymentIntent(paymentMethod.stripe_payment_method_id);
    }
  };

  const handleUseOneTimePayment = () => {
    setUseOneTimePayment(true);
    setSelectedPaymentMethod(null);
    // Create new payment intent without a payment method for one-time payment
    createPaymentIntent();
  };

  // No clientSecret for BOG

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Frictionless Payment Mode (Development) */}
      {isFrictionlessPaymentsEnabled() && (
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                🔧 Development Mode - Frictionless Payment
              </p>
              <p className="text-sm text-muted-foreground">
                No payment credentials required. Click below to simulate payment.
              </p>
            </div>
          </div>
          
          <div className="p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-blue-800">Mock Payment</p>
              <p className="text-xs text-blue-600">
                This will create a booking without processing real payment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Payment Methods - only show if not in one-time flow */}
      {!isFrictionlessPaymentsEnabled() && !useOneTimePayment && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">{t('payment.choosePaymentMethod')}</h4>
          
          <SavedPaymentMethods
            onPaymentMethodSelect={handlePaymentMethodSelect}
            selectedPaymentMethodId={selectedPaymentMethod?.stripe_payment_method_id}
            showAddNew={false}
          />
          
          {/* One-time Payment Option */}
          <div className="space-y-4">
            <Button
              type="button"
              variant={useOneTimePayment ? "default" : "outline"}
              onClick={handleUseOneTimePayment}
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with New Card (One-time)
            </Button>
          </div>
        </div>
      )}

      {/* One-time Payment Form - show when useOneTimePayment is true */}
      {!isFrictionlessPaymentsEnabled() && useOneTimePayment && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Choose Payment Method</h4>
          <div className="p-4 border border-border/50 rounded-xl bg-background/50">
            {/* Card input removed for BOG redirect flow */}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('payment.cardNotSaved')}
          </div>
        </div>
      )}
      
      {!isFrictionlessPaymentsEnabled() && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>{t('payment.paymentSecure')}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isFrictionlessPaymentsEnabled() ? isProcessing || disabled : (!stripe || isProcessing || disabled || (!selectedPaymentMethod && !useOneTimePayment))}
        className="w-full pulse-glow bg-gradient-to-r from-primary to-secondary"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {t('payment.processingPayment')}
          </div>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {isFrictionlessPaymentsEnabled() 
              ? `🔧 Mock Pay ${bookingData.discountedTotal ? bookingData.discountedTotal.toFixed(2) : bookingData.totalPrice} ${t('booking.currency')}`
              : `${t('payment.pay')} ${bookingData.discountedTotal ? bookingData.discountedTotal.toFixed(2) : bookingData.totalPrice} ${t('booking.currency')}`
            }
          </>
        )}
      </Button>
    </form>
  );
};

interface BookingData {
  venueId: string;
  venueName: string;
  serviceIds: string[];
  date: string;
  arrivalTime: string;
  departureTime: string;
  serviceBookings: Array<{
    serviceId: string;
    arrivalTime: string;
    departureTime: string;
    numberOfTables?: number;
    tableConfigurations?: Array<{
      table_number: number;
      guest_count: number;
    }>;
  
    originalPrice?: number;
    finalPrice?: number;
    savings?: number;
    appliedDiscounts?: string[];
    discountBreakdown?: any;
  }>;
  guests: number;
  specialRequests?: string;
  totalPrice: number;
  discountedTotal?: number;
  totalSavings?: number;
}

interface LocationState {
  bookingData: BookingData;
  requiresAuth?: boolean;
}

const ConfirmAndPay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { translateService } = useServiceTranslation();
  
  const locationState = location.state as LocationState;
  const bookingData = locationState?.bookingData;
  
  const { data: venue } = useVenue(bookingData?.venueId);
  const { data: services } = useVenueServices(bookingData?.venueId || '');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [useOneTimePaymentFlow, setUseOneTimePaymentFlow] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [isGuestFlow, setIsGuestFlow] = useState(false);
  const [guestEmailError, setGuestEmailError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {}, [currentStep]);

  if (!bookingData || !venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('booking.notFound')}</h1>
          <Button onClick={() => navigate('/')}>{t('common.home')}</Button>
        </div>
      </div>
    );
  }

  const handleContinue = async () => {
    
    // Simple step progression like the original working code
    if (currentStep === 1) {
      if (!user) {
        toast({
          title: t('auth.required'),
          description: t('auth.signInToContinue'),
        });
        return;
      }
      // If authenticated, proceed to next step
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Simplified validation - allow progression even without strict payment method check
      setCurrentStep(3);
      return;
    }
  };

  const handlePaymentSuccess = (data: any) => {
    setBookingComplete(true);
    toast({
      title: t('booking.requestSubmitted'),
      description: t('booking.requestSubmittedDescription'),
    });
    
    setTimeout(() => {
      navigate('/booking-history');
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: t('payment.failed'),
      description: error,
      variant: "destructive",
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = Math.max(1, currentStep - 1);
      setCurrentStep(prevStep);
      return;
    }
    // If on first step, go back to venue page
    navigate(`/venue/${bookingData.venueId}`, { state: { bookingData } });
  };

  const handlePaymentMethodSelect = (method: any) => {
    setPaymentMethodAdded(!!method);
    setUseOneTimePaymentFlow(false);
  };

  const handleOneTimePaymentSelect = () => {
    setUseOneTimePaymentFlow(true);
    setPaymentMethodAdded(false);
    // Automatically proceed to step 3 when one-time payment is selected
    setCurrentStep(3);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "EEEE, MMM d, yyyy");
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === '') {
      return 'Not selected';
    }
    const [hours, minutes] = timeString.split(':');
    if (!hours || !minutes) {
      return 'Invalid time';
    }
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    // Parse time components to avoid timezone issues
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
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
    
    const diffHours = Math.floor(durationMinutes / 60);
    const diffMinutes = durationMinutes % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (!service) return 'Unknown Service';
    
    return translateService({
      name: service.services?.name || service.name || 'Unknown Service',
      name_en: service.services?.name_en,
      name_ka: service.services?.name_ka
    });
  };

  const getTotalTables = () => {
    if (!bookingData.serviceBookings || bookingData.serviceBookings.length === 0) {
      return 0;
    }
    
    return bookingData.serviceBookings.reduce((total, booking) => {
      if (booking.tableConfigurations && booking.tableConfigurations.length > 0) {
        return total + booking.tableConfigurations.length;
      }
      return total + (booking.numberOfTables || 1); // Fallback to numberOfTables or 1
    }, 0);
  };

  const getTotalGuests = () => {
    if (!bookingData.serviceBookings || bookingData.serviceBookings.length === 0) {
      return bookingData.guests; // Fallback to main guest count
    }
    
    return bookingData.serviceBookings.reduce((total, booking) => {
      if (booking.tableConfigurations && booking.tableConfigurations.length > 0) {
        // Sum up guests from all table configurations
        return total + booking.tableConfigurations.reduce((tableTotal, config) => {
          return tableTotal + config.guest_count;
        }, 0);
      }
      return total + bookingData.guests; // Fallback to main guest count
    }, 0);
  };

  const getServiceGuests = (serviceBooking: any) => {
    // Get the service to check its pricing model
    const service = services?.find(s => s.id === serviceBooking.serviceId);
    
    // For table-wise services, guest count is not relevant
    if (service && ['table_wise', 'per_table'].includes(service.pricing_model)) {
      return 0;
    }
    
    if (serviceBooking.tableConfigurations && serviceBooking.tableConfigurations.length > 0) {
      return serviceBooking.tableConfigurations.reduce((total: number, config: any) => {
        return total + config.guest_count;
      }, 0);
    }
    return bookingData.guests; // Fallback to main guest count
  };

  // Use the discounted total from booking data if available, otherwise calculate it
  const discountedTotal = bookingData.discountedTotal || bookingData.totalPrice;
  const totalSavings = bookingData.totalSavings || 0;

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-background">
        {/* Floating back-to-venue arrow (non-animated, high contrast) */}
        <div className="fixed left-4 top-24 z-50" aria-hidden="false">
          <Button
            variant="default"
            size="icon-lg"
            onClick={() => navigate(`/venue/${bookingData.venueId}` , { state: { bookingData } })}
            className="rounded-full shadow-xl ring-1 ring-primary/30 hover:bg-primary/80 hover:shadow-primary/30 hover:scale-100 active:scale-100"
            aria-label="Back to venue"
            title="Back to venue"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        {/* Header */}
        <div className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold gradient-text">{t('payment.confirmAndPay')}</h1>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep > 1 ? 'bg-green-500 text-white' : currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="text-sm font-medium">{t('payment.logInOrSignUp')}</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep > 2 ? 'bg-green-500 text-white' : currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="text-sm font-medium">{t('payment.addPaymentMethod')}</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                bookingComplete ? 'bg-green-500 text-white' : currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {bookingComplete ? '✓' : '3'}
              </div>
                              <span className="text-sm font-medium">{t('payment.completePayment')}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side - Steps */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1 - Login */}
            <Card className={`glass-effect transition-all duration-300 ease-in-out ${
              currentStep === 1 ? 'border-primary/50 scale-100' : currentStep > 1 ? 'border-primary/30 scale-95' : 'border-border/50 scale-90 opacity-60'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      currentStep > 1 ? 'bg-green-500 text-white' : user ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t('payment.logInOrSignUp')}</h3>
                      {user && (
                        <p className="text-sm text-muted-foreground">{t('payment.loggedInAs')} {user.email}</p>
                      )}
                      {currentStep > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">{t('common.completed')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                   {currentStep === 1 && (
                     <>
                       {user ? (
                         <div className="flex gap-2">
                           <Button 
                             onClick={handleContinue}
                             className="pulse-glow"
                           >
                             {t('common.continue')}
                           </Button>
                         </div>
                       ) : (
                         <>
                           <div className="flex gap-2">
                            <AuthDialog defaultMode="signin">
                              <Button className="pulse-glow">
                                {t('common.login')}
                              </Button>
                            </AuthDialog>
                            {/* Continue without account */}
                            {!isGuestFlow ? (
                              <Button variant="outline" onClick={() => setIsGuestFlow(true)}>
                                {t('payment.continueWithoutAccount')}
                              </Button>
                            ) : null}
                           </div>
                           {isGuestFlow && (
                             <div className="mt-3 space-y-2">
                               <Label htmlFor="guestEmail">{t('payment.emailAddress')}</Label>
                               <Input
                                 id="guestEmail"
                                 type="email"
                                 value={guestEmail}
                                 placeholder="you@example.com"
                                 onChange={(e) => { setGuestEmail(e.target.value); setGuestEmailError(''); }}
                               />
                               {guestEmailError && <div className="text-sm text-red-600">{guestEmailError}</div>}
                               
                               {/* Terms Agreement Checkbox */}
                               <div className="space-y-3">
                                 <label className="flex items-start gap-3">
                                   <Checkbox 
                                     checked={agreeTerms} 
                                     onCheckedChange={(v) => setAgreeTerms(Boolean(v))}
                                     className="mt-0.5"
                                   />
                                   <span className="text-sm leading-relaxed">
                                     <Trans
                                       i18nKey="auth.agreeTerms"
                                       components={{
                                         1: <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />,
                                         2: <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                                       }}
                                     />
                                   </span>
                                 </label>
                               </div>
                               
                               <div className="flex gap-2">
                                 <Button 
                                   disabled={!agreeTerms}
                                   onClick={() => {
                                     const email = guestEmail.trim().toLowerCase();
                                     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                     if (!email || !emailRegex.test(email)) { 
                                       setGuestEmailError(t('payment.invalidEmail')); 
                                       return; 
                                     }
                                     if (!agreeTerms) {
                                       toast({
                                         title: t('auth.termsRequired'),
                                         description: t('auth.termsRequiredDesc'),
                                         variant: "destructive",
                                       });
                                       return;
                                     }
                                     setIsGuestFlow(true);
                                     setCurrentStep(2);
                                   }}>
                                   {t('common.continue')}
                                 </Button>
                                 <Button variant="ghost" onClick={() => setIsGuestFlow(false)}>
                                   {t('common.cancel')}
                                 </Button>
                               </div>
                               <div className="text-xs text-muted-foreground">
                                 {t('payment.noAccount')} <AuthDialog defaultMode="signup"><span className="underline cursor-pointer">{t('payment.createAccount')}</span></AuthDialog>
                               </div>
                             </div>
                           )}
                         </>
                       )}
                     </>
                   )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2 - Payment Method */}
            <Card className={`glass-effect transition-all duration-300 ease-in-out ${
              currentStep === 2 ? 'border-primary/50 scale-100' : currentStep > 2 ? 'border-primary/30 scale-95' : 'border-border/30 scale-90 opacity-60'
            } ${currentStep < 2 ? 'pointer-events-none' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      currentStep > 2 ? 'bg-green-500 text-white' : currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > 2 ? '✓' : '2'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t('payment.addPaymentMethod')}</h3>
                      {currentStep > 2 && (
                        <p className="text-sm text-muted-foreground">{t('payment.paymentMethodsReady')}</p>
                      )}
                      {currentStep > 2 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">{t('common.completed')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {currentStep === 2 && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={handleBack}
                        aria-label="Previous step"
                        title="Previous step"
                        className="rounded-full"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleContinue}
                        className="pulse-glow"
                      >
                        {t('common.continue')}
                      </Button>
                    </div>
                  )}
                </div>
                 {currentStep === 2 && (
                   <div className="mt-4 space-y-4">
                     <SavedPaymentMethods 
                       showAddNew={true}
                       onPaymentMethodSelect={handlePaymentMethodSelect}
                     />
                     <div className="border-t border-border/50 pt-4">
                       <Button 
                         variant="outline"
                         onClick={handleOneTimePaymentSelect}
                         className="w-full"
                       >
                         <CreditCard className="w-4 h-4 mr-2" />
                         {t('payment.payOneTime')}
                       </Button>
                       <p className="text-xs text-muted-foreground mt-2 text-center">
                         {t('payment.payOneTimeDescription')}
                       </p>
                     </div>
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Step 3 - Review & Pay */}
            <Card className={`glass-effect transition-all duration-300 ease-in-out ${
              currentStep === 3 ? 'border-primary/50 scale-100' : 'border-border/30 scale-90 opacity-60'
            } ${currentStep < 3 ? 'pointer-events-none' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4 justify-between">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    bookingComplete ? 'bg-green-500 text-white' : currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {bookingComplete ? '✓' : '3'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{t('payment.completePayment')}</h3>
                    <p className="text-sm text-muted-foreground">{t('payment.completePaymentDescription')}</p>
                  </div>
                  {currentStep === 3 && !bookingComplete && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={handleBack}
                        aria-label="Previous step"
                        title="Previous step"
                        className="rounded-full"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                 {currentStep === 3 && !bookingComplete && (
                   <PaymentForm
                     bookingData={bookingData}
                     onSuccess={handlePaymentSuccess}
                     onError={handlePaymentError}
                     disabled={!user}
                     useOneTimeFlow={useOneTimePaymentFlow}
                     isGuest={isGuestFlow && !user}
                     guestEmail={guestEmail}
                   />
                 )}

                {bookingComplete && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">✓</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-lg text-foreground mb-2">{t('payment.bookingConfirmed')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('payment.paymentProcessed')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Booking Summary */}
          <div className="lg:col-span-5">
            <Card className="glass-effect border-primary/20 sticky top-24">
              <CardContent className="p-6 space-y-6">
                {/* Removed extra back button to keep only the floating arrow */}
                
                {/* Venue Info */}
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center">
                    {venue.images && venue.images[0] ? (
                      <img 
                        src={venue.images[0]} 
                        alt={venue.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">Gaming</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{venue.name}</h3>
                    <p className="text-sm text-muted-foreground">Premium gaming experience</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-sm font-medium">{venue.rating}</span>
                      <span className="text-sm text-muted-foreground">({venue.review_count})</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{t('payment.nonRefundable')}</p>
                  
                  {/* Booking Summary */}
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{getTotalGuests()} {getTotalGuests() > 1 ? t('payment.guests') : t('payment.guest')}</span>
                      </div>
                      {getTotalTables() > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{getTotalTables()} {getTotalTables() !== 1 ? t('payment.tables') : t('payment.table')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Date and Time */}
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{t('common.date')}</h4>
                    <p className="text-sm text-muted-foreground">{formatDate(bookingData.date)}</p>
                  </div>

                  {/* Services and Times */}
                  {bookingData.serviceBookings && bookingData.serviceBookings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">{t('venue.selectedServices')}</h4>
                      <div className="space-y-3">
                        {bookingData.serviceBookings.map((booking, index) => (
                          <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-foreground">{getServiceName(booking.serviceId)}</h5>
                              <Badge variant="secondary" className="text-xs">
                                {formatTime(booking.arrivalTime)} - {formatTime(booking.departureTime)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {t('payment.duration')}: {calculateDuration(booking.arrivalTime, booking.departureTime)}
                              {getServiceGuests(booking) > 0 && (
                                <> • {getServiceGuests(booking)} {getServiceGuests(booking) > 1 ? t('payment.guests') : t('payment.guest')}</>
                              )}
                              • {booking.tableConfigurations?.length || booking.numberOfTables || 1} {(booking.tableConfigurations?.length || booking.numberOfTables || 1) !== 1 ? t('payment.tables') : t('payment.table')}
                            </p>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overall Time Range (if services are selected) */}
                  {(!bookingData.serviceBookings || bookingData.serviceBookings.length === 0) && (
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{t('payment.bookingTime')}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(bookingData.arrivalTime)} - {formatTime(bookingData.departureTime)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('payment.duration')}: {calculateDuration(bookingData.arrivalTime, bookingData.departureTime)}
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{t('venue.location')}</h4>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{venue.location}</p>
                    </div>
                  </div>

                  {/* Special Requests */}
                  {bookingData.specialRequests && (
                    <div>
                      <h4 className="font-medium text-foreground mb-1">Comment</h4>
                      <p className="text-sm text-muted-foreground">{bookingData.specialRequests}</p>
                    </div>
                  )}
                </div>

                {/* Price Details */}
                <div className="border-t border-border/50 pt-4 space-y-3">
                  <h4 className="font-medium text-foreground">{t('payment.priceDetails')}</h4>
                  
                  {bookingData.serviceBookings && bookingData.serviceBookings.length > 0 ? (
                    <div className="space-y-2">
                      {bookingData.serviceBookings.map((booking, index) => (
                        <div key={index}>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              {getServiceName(booking.serviceId)}
                              {getServiceGuests(booking) > 0 && (
                                <> × {getServiceGuests(booking)} guest{getServiceGuests(booking) > 1 ? 's' : ''}</>
                              )}
                              × {calculateDuration(booking.arrivalTime, booking.departureTime).replace('h', ' hours').replace('m', ' mins')}
                            </span>
                            <span className="text-sm text-foreground">
                              {booking.finalPrice ? booking.finalPrice.toFixed(2) : Math.round((bookingData.totalPrice / bookingData.serviceBookings.length))}₾
                            </span>
                          </div>
                          {/* Show discount info for this service */}
                          {(booking.savings ?? 0) > 0 && (
                            <div className="flex justify-between text-xs text-green-600 mt-1">
                              <span>{t('payment.discount')} ({booking.appliedDiscounts?.join(', ')})</span>
                              <span>-{booking.savings.toFixed(2)} {t('booking.currency')}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Service booking × {bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-foreground">{discountedTotal.toFixed(2)} {t('booking.currency')}</span>
                    </div>
                  )}
                  
                  {/* Show total savings if any */}
                  {totalSavings > 0 && (
                    <div className="border-t border-border/50 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('payment.originalPrice')}</span>
                        <span className="line-through text-muted-foreground">{bookingData.totalPrice.toFixed(2)} {t('booking.currency')}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t('payment.totalSavings')}</span>
                        <span>-{totalSavings.toFixed(2)} {t('booking.currency')}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-border/50 pt-3 flex justify-between font-semibold">
                    <span className="text-foreground">{t('payment.total')}</span>
                    <span className={`text-foreground gradient-text text-lg ${totalSavings > 0 ? 'text-green-600' : ''}`}>
                                              {discountedTotal.toFixed(2)} {t('booking.currency')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </Elements>
  );
};

export default ConfirmAndPay;
