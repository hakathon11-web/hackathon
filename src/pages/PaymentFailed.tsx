import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { analyticsEvents } from '@/lib/analytics';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const orderId = searchParams.get('order_id');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');

  useEffect(() => {
    // Track payment failure
    if (orderId) {
      analyticsEvents.error('payment_failed', `Order: ${orderId}, Error: ${error || 'Unknown'}`);
    }

    // Set error details from URL params
    if (error) {
      setErrorDetails(error);
    } else if (errorCode) {
      setErrorDetails(`Error code: ${errorCode}`);
    }
  }, [orderId, error, errorCode]);

  const getErrorMessage = () => {
    if (error) {
      // Map common BOG error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'card_declined': 'Your card was declined. Please try a different payment method.',
        'insufficient_funds': 'Insufficient funds. Please check your account balance.',
        'expired_card': 'Your card has expired. Please use a different card.',
        'invalid_card': 'Invalid card information. Please check your card details.',
        'payment_timeout': 'Payment timed out. Please try again.',
        'cancelled_by_user': 'Payment was cancelled.',
        'general_error': 'A payment error occurred. Please try again.',
      };

      return errorMessages[error] || 'Payment could not be completed. Please try again.';
    }
    
    return 'Your payment could not be processed at this time.';
  };

  const handleRetryPayment = () => {
    // Clear any stored payment data and go back to booking
    sessionStorage.removeItem('bog_order_for_saving');
    
    // Try to go back to the last venue or booking flow
    const lastVenue = sessionStorage.getItem('lastBookingVenue');
    if (lastVenue) {
      navigate(`/venue/${lastVenue}`);
    } else {
      navigate('/');
    }
  };

  const handleContactSupport = () => {
    // Navigate to contact page with pre-filled error info
    const contactParams = new URLSearchParams({
      subject: 'Payment Issue',
      message: `I encountered a payment issue with order ${orderId || 'unknown'}. Error: ${error || 'Unknown error'}`
    });
    navigate(`/contact?${contactParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
              <p className="text-muted-foreground">There was an issue processing your payment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Error Message */}
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-800">Payment Could Not Be Completed</h2>
                  <p className="text-red-700 mt-1">
                    {getErrorMessage()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Details */}
          {errorDetails && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Technical details:</strong> {errorDetails}
                {orderId && (
                  <>
                    <br />
                    <strong>Order ID:</strong> {orderId}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* What to do next */}
          <Card>
            <CardHeader>
              <CardTitle>What can you do next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Try Again</h3>
                  <p className="text-sm text-muted-foreground">
                    Most payment issues are temporary. You can try making the payment again.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Different Payment Method</h3>
                  <p className="text-sm text-muted-foreground">
                    Try using a different card or payment method if available.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Check Your Card</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure your card has sufficient funds and is not expired.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">Contact Support</h3>
                  <p className="text-sm text-muted-foreground">
                    If the problem persists, our support team can help you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRetryPayment}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Payment Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleContactSupport}
              className="flex-1"
            >
              Contact Support
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              No charges were made to your account. You can safely try again or contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
