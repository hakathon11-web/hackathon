import { useState, useEffect } from 'react';

export type BookingStep = 'date' | 'service' | 'time';

export interface BookingFlowGuide {
  currentStep: BookingStep;
  isDateSelected: boolean;
  isServiceSelected: boolean;
  isTimeSelected: boolean;
  getGlowClass: (step: BookingStep) => string;
  getGlowStyle: (step: BookingStep) => React.CSSProperties;
  markStepComplete: (step: BookingStep) => void;
  resetFlow: () => void;
}

export const useBookingFlowGuide = (
  date?: Date,
  serviceIds: string[] = [],
  serviceBookings: any[] = []
): BookingFlowGuide => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('date');
  const [isDateSelected, setIsDateSelected] = useState(false);
  const [isServiceSelected, setIsServiceSelected] = useState(false);
  const [isTimeSelected, setIsTimeSelected] = useState(false);

  // Update state based on props
  useEffect(() => {
    if (date) {
      setIsDateSelected(true);
      if (currentStep === 'date') {
        setCurrentStep('service');
      }
    }
  }, [date]);

  useEffect(() => {
    // Mark service step as started, but do not advance automatically.
    setIsServiceSelected(serviceIds.length > 0);
    if (serviceIds.length === 0 && isDateSelected) {
      setCurrentStep('service');
    }
  }, [serviceIds, isDateSelected]);

  useEffect(() => {
    const hasAnyBookings = serviceBookings.length > 0;
    const hasCompleteTimeBookings = hasAnyBookings && serviceBookings.every(
      booking => booking.arrivalTime && booking.departureTime
    );

    setIsTimeSelected(!!hasCompleteTimeBookings);

    // Advance to time only when bookings are complete; otherwise stay on service.
    if (hasCompleteTimeBookings) {
      setCurrentStep('time');
    } else if (isDateSelected) {
      setCurrentStep('service');
    }
  }, [serviceBookings, isDateSelected]);

  const getGlowClass = (step: BookingStep): string => {
    if (step !== currentStep) return '';
    
    // Use custom CSS classes for enhanced glow effects
    switch (step) {
      case 'date':
        return 'booking-glow-date ring-2 ring-blue-400 ring-opacity-75';
      case 'service':
        return 'booking-glow-service ring-2 ring-green-400 ring-opacity-75';
      case 'time':
        return 'booking-glow-time ring-2 ring-purple-400 ring-opacity-75';
      default:
        return '';
    }
  };

  const getGlowStyle = (step: BookingStep): React.CSSProperties => {
    if (step !== currentStep) return {};
    
    // Return empty object since we're using custom CSS classes
    // This method is kept for backward compatibility
    return {};
  };

  const markStepComplete = (step: BookingStep) => {
    switch (step) {
      case 'date':
        setIsDateSelected(true);
        setCurrentStep('service');
        break;
      case 'service':
        // Mark service as selected, but do not force-advance.
        setIsServiceSelected(true);
        break;
      case 'time':
        setIsTimeSelected(true);
        break;
    }
  };

  const resetFlow = () => {
    setCurrentStep('date');
    setIsDateSelected(false);
    setIsServiceSelected(false);
    setIsTimeSelected(false);
  };

  return {
    currentStep,
    isDateSelected,
    isServiceSelected,
    isTimeSelected,
    getGlowClass,
    getGlowStyle,
    markStepComplete,
    resetFlow,
  };
};
