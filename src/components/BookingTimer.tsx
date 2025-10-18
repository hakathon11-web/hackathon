import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';

interface BookingTimerProps {
  createdAt: string;
  status: string;
  onTimeout?: () => void;
  className?: string;
}

export const BookingTimer: React.FC<BookingTimerProps> = ({
  createdAt,
  status,
  onTimeout,
  className = ""
}) => {
  const { data: systemSettings } = useSystemSettings();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  
  const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;
  
  // Only log when settings actually change, not on every render
  useEffect(() => {
    console.log('⏱️ BookingTimer - Current timeout from settings:', timeoutMinutes, 'minutes | Full settings:', systemSettings);
  }, [timeoutMinutes, systemSettings]);

  // Listen for system settings changes with immediate effect
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      console.log('🔄 BookingTimer: System settings changed, recalculating timer...', event.detail);
      // Force immediate recalculation by clearing state
      setTimeLeft(0);
      setIsExpired(false);
      // The next useEffect will recalculate with new settings
    };

    const handleGlobalTimeoutChange = (event: CustomEvent) => {
      console.log('🌐 BookingTimer: Global timeout change detected:', event.detail);
      setTimeLeft(0);
      setIsExpired(false);
    };

    const handleAdminTimeoutSync = (event: CustomEvent) => {
      console.log('🎯 BookingTimer: Admin timeout sync - now using:', event.detail.timeoutMinutes, 'minutes');
      setTimeLeft(0);
      setIsExpired(false);
    };

    window.addEventListener('system-settings-changed', handleSettingsChange as EventListener);
    window.addEventListener('global-timeout-change', handleGlobalTimeoutChange as EventListener);
    window.addEventListener('admin-timeout-sync', handleAdminTimeoutSync as EventListener);
    
    return () => {
      window.removeEventListener('system-settings-changed', handleSettingsChange as EventListener);
      window.removeEventListener('global-timeout-change', handleGlobalTimeoutChange as EventListener);
      window.removeEventListener('admin-timeout-sync', handleAdminTimeoutSync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (status !== 'pending') {
      setTimeLeft(0);
      return;
    }

    console.log(`⏱️ Timer setup: booking created at ${createdAt}, using ${timeoutMinutes} minutes timeout`);

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const created = new Date(createdAt).getTime();
      const timeoutDuration = timeoutMinutes * 60 * 1000; // Convert to milliseconds
      const targetTime = created + timeoutDuration;
      const remaining = targetTime - now;

      if (remaining <= 0) {
        if (!isExpired) {
          console.log('⏰ Timer expired for booking created at:', createdAt);
          setIsExpired(true);
          if (onTimeout) {
            onTimeout();
          }
        }
        setTimeLeft(0);
        return;
      }

      setTimeLeft(remaining);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt, status, timeoutMinutes, onTimeout, isExpired, systemSettings]);

  // Listen for real-time status changes
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { bookingId, newStatus } = event.detail;
      if (bookingId && newStatus && newStatus !== status) {
        // Force re-render when status changes
        setTimeLeft(0);
        setIsExpired(false);
      }
    };

    window.addEventListener('booking-status-changed', handleStatusChange as EventListener);
    return () => {
      window.removeEventListener('booking-status-changed', handleStatusChange as EventListener);
    };
  }, [status]);

  if (status !== 'pending') {
    // Show regular status for non-pending bookings
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'rejected':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'expired':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'Confirmed';
        case 'rejected':
          return 'Rejected';
        case 'expired':
          return 'Expired';
        default:
          return status;
      }
    };

    return (
      <Badge className={`${getStatusColor(status)} ${className}`}>
        {getStatusText(status)}
      </Badge>
    );
  }

  if (isExpired || timeLeft === 0) {
    return (
      <Badge className={`bg-red-100 text-red-800 border-red-200 ${className}`}>
        Expired
      </Badge>
    );
  }

  // Convert milliseconds to minutes and seconds
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const getTimerColor = () => {
    if (minutes >= 3) return 'bg-green-100 text-green-800 border-green-200';
    if (minutes >= 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Badge className={`${getTimerColor()} animate-pulse ${className} flex items-center gap-1 px-1 py-0.5 w-fit`}>
      <Clock className="w-3 h-3" />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </Badge>
  );
};

export default BookingTimer;