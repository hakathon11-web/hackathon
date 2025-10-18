import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import AuthDialog from '@/components/AuthDialog';
import { useBogSavedCards } from '@/hooks/useBogSavedCards';
import { useToast } from '@/hooks/use-toast';
import { analyticsEvents } from '@/lib/analytics';
import { isFrictionlessPaymentsEnabled } from '@/config/development';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Plus, 
  Lock, 
  CheckCircle, 
  User, 
  ArrowRight,
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Users,
  Loader2,
  LogIn,
  Mail
} from 'lucide-react';
// Stripe removed
import { modalHistory } from '@/lib/modalHistory';
import { clearPendingBookingContext, savePendingBookingContext } from '@/lib/pendingBooking';
import { supabase } from '@/integrations/supabase/client';

// Stripe removed

interface BookingData {
  venueId: string;
  venueName: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  serviceBookings: any[];
  guests: number;
  serviceIds: string[];
  totalPrice: number;
  discountedTotal: number;
  totalSavings: number;
  specialRequests: string;
}

interface BookingPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData | null;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

// Payment Form Component
const PaymentForm = ({ 
  bookingData, 
  onSuccess, 
  onError, 
  onBack,
  savedPaymentMethods,
  onAddNewCard,
  useNewCard: initialUseNewCard,
  paymentMethodsLoading,
  user,
  isGuestFlow,
  isGuest,
  guestEmail
}: { 
  bookingData: BookingData;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
  savedPaymentMethods: any[];
  onAddNewCard: () => void;
  useNewCard: boolean;
  paymentMethodsLoading: boolean;
  isGuest?: boolean;
  guestEmail?: string;
  user?: any;
  isGuestFlow?: boolean;
}) => {
  // Stripe removed
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Debug: Log props to see what's being passed
  console.log('PaymentForm props:', { isGuest, isGuestFlow, user, guestEmail });

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [useNewCard, setUseNewCard] = useState(initialUseNewCard);
  const [saveCard, setSaveCard] = useState(false);

  // No pre-initialization needed for BOG

  // Auto-disable card saving and new card options for guest users
  useEffect(() => {
    if (!user) {
      setSaveCard(false);
      setUseNewCard(false);
    }
  }, [user]);

  // Auto-select first saved payment method if available
  useEffect(() => {
    console.log('PaymentForm - savedPaymentMethods:', savedPaymentMethods);
    console.log('PaymentForm - selectedPaymentMethod:', selectedPaymentMethod);
    if (savedPaymentMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(savedPaymentMethods[0]);
    }
  }, [savedPaymentMethods, selectedPaymentMethod]);

  const createBogOrder = async (useSavedCard = false) => {
    try {
      console.log('BookingPaymentDialog - Creating BOG order for booking data:', bookingData);
      console.log('Current user:', user);
      console.log('Is guest flow:', isGuestFlow);
      console.log('Is guest:', isGuest);
      console.log('Guest email:', guestEmail);
      
      // Debug: Check if isGuest is defined
      console.log('isGuest type:', typeof isGuest);
      console.log('isGuest value:', isGuest);
      
      // Debug: Check if user has valid session
      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Current session:', sessionData);
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
          console.log('Session refreshed:', refreshData);
        }
      }
      // Compute robust amount on client as a safety net
      const computeAmount = () => {
        const totals: number[] = [];
        const discounted = Number(bookingData.discountedTotal);
        const original = Number(bookingData.totalPrice);
        if (Number.isFinite(discounted) && discounted > 0) totals.push(discounted);
        if (Number.isFinite(original) && original > 0) totals.push(original);
        // Fallback: sum per-service final/original prices
        const servicesSum = Array.isArray(bookingData.serviceBookings)
          ? bookingData.serviceBookings.reduce((sum: number, sb: any) => {
              const fp = Number(sb?.finalPrice);
              const op = Number(sb?.originalPrice);
              if (Number.isFinite(fp) && fp > 0) return sum + fp;
              if (Number.isFinite(op) && op > 0) return sum + op;
              return sum;
            }, 0)
          : 0;
        if (servicesSum > 0) totals.push(servicesSum);
        // Choose best available positive amount
        const chosen = totals.length > 0 ? Math.max(...totals) : 0;
        // Enforce 2-decimal precision
        return Math.round(chosen * 100) / 100;
      };

      const safeAmount = computeAmount();

      let functionName = 'bog-create-order';
      let payload: any = {
        amount: safeAmount,
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
        // Force mock mode if frictionless UI is active
        mock: isFrictionlessPaymentsEnabled(),
      };

      // If guest flow, use guest endpoint
      if ((typeof (arguments as any) !== 'undefined') && (arguments as any) && (arguments as any).callee) {}
      if (typeof (isGuest) !== 'undefined' && isGuest) {
        console.log('Using guest endpoint: bog-create-order-guest');
        functionName = 'bog-create-order-guest';
        payload = {
          ...payload,
          guestEmail,
        };
      } else {
        console.log('Using authenticated endpoint: bog-create-order');
      }

      // In frictionless mode, always go through mock flow regardless of saved card
      if (!isFrictionlessPaymentsEnabled()) {
        // If using saved card, call different endpoint
        if (useSavedCard && selectedPaymentMethod?.bog_order_id) {
          functionName = 'bog-payment-with-saved-card';
          payload = {
            parentOrderId: selectedPaymentMethod.bog_order_id,
            amount: safeAmount,
            bookingData: payload.bookingData,
            locale: payload.locale,
          };
        }
      }

      console.log('Calling function:', functionName, 'with payload:', payload);
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });
      console.log('Function response:', { data, error });

      if (error) throw error;
      
      if (data?.redirectUrl) {
        // Save card settings BEFORE redirecting (BOG requirement)
        if (!useSavedCard && saveCard) {
          try {
            await supabase.functions.invoke('bog-save-card', {
              body: { orderId: data.orderId, idempotencyKey: crypto.randomUUID() }
            });
          } catch (saveError) {
            console.error('Failed to set card saving:', saveError);
            toast({
              title: "Card Save Warning",
              description: "Card saving setup failed, but payment will continue normally.",
            });
          }
        }
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Missing redirect URL from payment provider');
      }
    } catch (error: any) {
      console.error('Error creating BOG order:', error);
      toast({
        title: "Payment Initialization Failed",
        description: error.message || 'Failed to initialize payment',
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    try {
      const usingSavedCard = selectedPaymentMethod && !useNewCard;
      await createBogOrder(usingSavedCard);
    } finally {
      setIsProcessing(false);
    }
  };

  // No clientSecret needed for BOG redirect flow

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Frictionless Payment Mode (Development) */}
      {isFrictionlessPaymentsEnabled() && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h4 className="text-base sm:text-lg font-semibold text-foreground">
              Development Mode - Mock Payment
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No payment credentials required.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {paymentMethodsLoading && !isFrictionlessPaymentsEnabled() && (
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('payment.loadingPaymentMethods')}
          </p>
        </div>
      )}

      {/* Saved Payment Methods (BOG saved cards) */}
      {!isFrictionlessPaymentsEnabled() && !paymentMethodsLoading && savedPaymentMethods.length > 0 && !useNewCard && (
        <div className="space-y-4">
          <div className="space-y-3">
            {savedPaymentMethods.map((method) => (
              <div
                key={method.id}
                className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedPaymentMethod?.id === method.id
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onClick={() => setSelectedPaymentMethod(method)}
              >
                <div className={`p-2 sm:p-3 rounded-lg transition-all duration-200 ${
                  selectedPaymentMethod?.id === method.id 
                    ? 'bg-primary/10 scale-110' 
                    : 'bg-muted group-hover:bg-primary/5'
                }`}>
                  <CreditCard className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-200 ${
                    selectedPaymentMethod?.id === method.id 
                      ? 'text-primary' 
                      : 'text-muted-foreground group-hover:text-primary'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm sm:text-base">
                    •••• •••• •••• {method.card_last4}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {t('payment.expires')} {method.card_exp_month}/{method.card_exp_year}
                  </div>
                </div>
                {selectedPaymentMethod?.id === method.id && (
                  <div className="flex items-center justify-center w-7 h-7 bg-primary rounded-full shadow-lg animate-in zoom-in duration-200">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Only show add new card button for authenticated users */}
          {user && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setUseNewCard(true)}
              className="w-full h-12 sm:h-12 text-base border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
            >
              <Plus className="h-5 w-5 mr-2 text-primary group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium text-sm sm:text-base">{t('payment.addNewCard')}</span>
            </Button>
          )}
        </div>
      )}

      {/* No Saved Payment Methods */}
      {!isFrictionlessPaymentsEnabled() && !paymentMethodsLoading && savedPaymentMethods.length === 0 && !useNewCard && (
        <div className="space-y-4">
          {user ? (
            <Button
              onClick={() => setUseNewCard(true)}
              className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('payment.addNewCard')}
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You'll be redirected to BOG payment gateway to complete your payment securely.
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Card Options for BOG - Only for authenticated users */}
      {!isFrictionlessPaymentsEnabled() && useNewCard && user && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Payment Options</h3>
            {savedPaymentMethods.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUseNewCard(false)}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 touch-manipulation"
              >
                ← Use Saved Card
              </Button>
            )}
          </div>
          
          {/* Only show save card option for authenticated users */}
          {user && (
            <div className="p-3 sm:p-4 border border-border rounded-xl bg-muted/30">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="saveCard"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
                  />
                  <div className="space-y-1">
                    <label htmlFor="saveCard" className="text-sm sm:text-sm font-medium text-foreground cursor-pointer">
                      Save card for future payments
                    </label>
                    <p className="text-xs sm:text-xs text-muted-foreground leading-relaxed">
                      Your card will be securely saved by BOG for faster checkout on future bookings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Show message for guest users */}
          {!user && (
            <div className="p-3 sm:p-4 border border-border rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-xs text-blue-600 dark:text-blue-400">ℹ</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Guest Checkout
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    Card saving is only available for registered users.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12 sm:h-12 text-base font-medium hover:bg-muted/50 transition-all duration-200 border-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('payment.back')}
        </Button>
        <Button
          type="submit"
          disabled={isProcessing}
          className="flex-1 h-12 sm:h-12 text-base bg-primary hover:bg-primary/90 font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('payment.processing')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm sm:text-base">
                {isFrictionlessPaymentsEnabled() 
                  ? `🔧 Mock Pay ${(bookingData.discountedTotal || bookingData.totalPrice).toFixed(2)} ${t('booking.currency')}`
                  : `${t('payment.pay')} ${(bookingData.discountedTotal || bookingData.totalPrice).toFixed(2)} ${t('booking.currency')}`
                }
              </span>
            </div>
          )}
        </Button>
      </div>
    </form>
  );
};

// Main Dialog Component
const BookingPaymentDialog = ({
  isOpen,
  onClose,
  bookingData,
  onSuccess,
  onError
}: BookingPaymentDialogProps) => {
  const { t } = useTranslation();
  const { user, signIn } = useAuth();
  const { savedCards: savedPaymentMethods = [], loading: paymentMethodsLoading, refreshSavedCards: refetchPaymentMethods } = useBogSavedCards();
  const { toast } = useToast();

  // Debug logging for dialog state changes
  useEffect(() => {
    console.log('BookingPaymentDialog - Dialog state changed:', { isOpen, hasBookingData: !!bookingData });
  }, [isOpen, bookingData]);

  // Dark mode detection for the main dialog
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Dynamic card element options based on dark mode (for components outside PaymentForm)
  const getCardElementOptions = () => ({
    style: {
      base: {
        fontSize: '16px',
        color: isDarkMode ? '#ffffff' : '#000000',
        '::placeholder': {
          color: isDarkMode ? '#a0a0a0' : '#6b7280',
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: '#ef4444',
      },
    },
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [useNewCard, setUseNewCard] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isGuestFlow, setIsGuestFlow] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailError, setGuestEmailError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Browser back-button integration: push a history entry when this dialog opens
  const registrationRef = useRef<ReturnType<typeof modalHistory.register> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!registrationRef.current) {
        registrationRef.current = modalHistory.register(() => onClose());
      }
      if (!bookingData) {
        // Defensive: if dialog opened without booking context (e.g., after refresh), clear any stale flags
        clearPendingBookingContext();
      }
    } else {
      registrationRef.current?.unregister();
      registrationRef.current = null;
    }
  }, [isOpen, onClose, bookingData]);

  // Reset step when dialog opens and auto-advance if already logged in
  useEffect(() => {
    if (isOpen) {
      if (user) {
        // If already logged in, skip to step 2 (Payment)
        setCurrentStep(2);
        // Close auth dialog if it was open
        // setShowAuthDialog(false); // This state variable is not defined in the original file
      } else {
        // If not logged in, start at step 1
        setCurrentStep(1);
      }
    }
  }, [isOpen, user]);

  // Watch for user authentication and advance to payment step
  useEffect(() => {
    if (isOpen && user) {
      setCurrentStep(2);
    }
  }, [user, isOpen]);

  // Debug: Log saved payment methods
  useEffect(() => {
    console.log('Saved payment methods:', savedPaymentMethods);
    console.log('User:', user);
  }, [savedPaymentMethods, user]);




  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleAddNewCard = () => {
    setShowCardForm(true);
  };

  const handlePaymentSuccess = (data: any) => {
    // Track successful booking completion
    if (bookingData) {
      analyticsEvents.bookingCompleted(
        data?.booking_id || 'unknown',
        bookingData.discountedTotal || bookingData.totalPrice || 0,
        t('booking.currency')
      );
    }
    
    onSuccess(data);
    onClose();
  };

  const handlePaymentError = (error: string) => {
    console.log('BookingPaymentDialog - Payment error:', error);
    // Show toast instead of calling onError to prevent dialog from closing
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
    // Don't call onError to prevent dialog from closing
    // onError(error);
  };

  const handleCardAdded = async () => {
    try {
      setIsProcessing(true);
      
      // In a real implementation, this would:
      // 1. Get the card element from Stripe
      // 2. Create a payment method
      // 3. Save it to the user's account
      
      // Close the form and refresh payment methods
      setShowCardForm(false);
      setUseNewCard(false);
      
      // Refresh the saved payment methods to show the newly added card
      await refetchPaymentMethods();
      
      toast({
        title: "Card Added Successfully",
        description: "Your payment method has been added and saved.",
      });
    } catch (error) {
      onError('Failed to add card. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!bookingData) return null;

  const handleDialogOpenChange = (open: boolean) => {
    console.log('BookingPaymentDialog - Dialog open change:', open);
    if (!open) {
      onClose();
    }
  };

  // Shared content component
  const renderContent = () => (
    <>
      {/* Desktop Header */}
      <DialogHeader className="hidden lg:block pb-4 px-6">
        <DialogTitle className="text-xl font-bold text-foreground">
          Complete Booking
        </DialogTitle>
      </DialogHeader>

      {/* Content Container */}
      <div className="px-4 lg:px-6 space-y-6">

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {user ? (
              /* User is signed in */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">
                    {user.email}
                  </p>
                </div>
                <Button
                  onClick={() => setCurrentStep(2)}
                  className="w-full h-12 sm:h-12 text-base bg-primary hover:bg-primary/90 font-semibold"
                >
                  Continue to Payment
                </Button>
              </div>
            ) : (
              /* User needs to sign in or continue as guest */
              <div className="space-y-4">
                {/* Sign In Button */}
                <AuthDialog defaultMode="signin">
                  <Button
                    onClick={() => {
                      if (!user && bookingData) {
                        savePendingBookingContext({
                          ...bookingData,
                          venueId: bookingData.venueId,
                          resumeAt: 'payment',
                        });
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full h-12 sm:h-12 text-base bg-primary hover:bg-primary/90 font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span className="text-sm sm:text-base">{t('payment.signingIn')}</span>
                      </>
                    ) : (
                      <span className="text-sm sm:text-base">{t('payment.signIn')}</span>
                    )}
                  </Button>
                </AuthDialog>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-background text-muted-foreground">or</span>
                  </div>
                </div>

                {/* Guest Checkout */}
                {!isGuestFlow ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 sm:h-12 text-base"
                    onClick={() => setIsGuestFlow(true)}
                  >
                    <span className="text-sm sm:text-base">{t('payment.continueWithoutAccount')}</span>
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={guestEmail}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        setGuestEmailError('');
                      }}
                      className="h-12 text-base"
                    />
                    {guestEmailError && (
                      <p className="text-sm text-red-600">{guestEmailError}</p>
                    )}
                    
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
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 sm:h-10 text-base"
                        onClick={() => setIsGuestFlow(false)}
                      >
                        <span className="text-sm sm:text-base">{t('common.cancel')}</span>
                      </Button>
                      <Button
                        className="flex-1 h-12 sm:h-10 text-base bg-primary hover:bg-primary/90"
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
                          // Store guest email in localStorage for payment success page
                          localStorage.setItem('guestEmail', email);
                          setIsGuestFlow(true);
                          setCurrentStep(2);
                        }}
                      >
                        <span className="text-sm sm:text-base">{t('common.continue')}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <PaymentForm
              bookingData={bookingData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onBack={handleBack}
              savedPaymentMethods={savedPaymentMethods}
              onAddNewCard={handleAddNewCard}
              useNewCard={useNewCard}
              paymentMethodsLoading={paymentMethodsLoading}
              isGuest={isGuestFlow && !user}
              guestEmail={guestEmail}
              user={user}
              isGuestFlow={isGuestFlow}
            />
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Dialog */}
      {!isMobile && (
        <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {renderContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer open={isOpen} onOpenChange={handleDialogOpenChange}>
          <DrawerContent className="max-h-[90vh] bg-background border-t shadow-2xl flex flex-col z-[60]">
            <DrawerHeader className="flex-shrink-0 pb-2 px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg sm:text-xl font-bold text-foreground">
                  Complete Booking
                </DrawerTitle>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-full transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background overscroll-contain">
              {renderContent()}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default BookingPaymentDialog;
