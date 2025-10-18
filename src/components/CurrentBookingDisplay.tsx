import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, MapPin, Users, Calendar, X, ExternalLink, History, EyeOff, ChevronUp, ChevronDown, CalendarDays, Star, AlertTriangle, Move } from 'lucide-react';
import { useUserBookings, useHideBookingFromWidget, useCancelBooking } from '@/hooks/useBookings';
import { useGuestBookings } from '@/hooks/useGuestBookings';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import BookingTimer from '@/components/BookingTimer';
import { getConfirmedBookings, getBookingStatusInfo, getCompletedBookings } from '@/utils/bookingStatus';
import { useUserReviewForBooking, useReviewedBookingIds } from '@/hooks/useReviews';
import ReviewDialog from '@/components/ReviewDialog';
import BookingDetailsDialog from '@/components/BookingDetailsDialog';
import { toast } from '@/hooks/use-toast';
import { formatBookingTimeDisplay } from '@/utils/bookingDisplay';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { BOOKING_TIMEOUT_MINUTES } from '@/constants/timeouts';
import { filterNonExpiredBookings } from '@/utils/bookingExpiration';
import { usePersistentWidgetState } from '@/hooks/usePersistentWidgetState';

interface CurrentBookingDisplayProps {
  onClose?: () => void;
  mode?: 'user' | 'guest';
}

const CurrentBookingDisplay: React.FC<CurrentBookingDisplayProps> = ({ onClose, mode = 'user' }) => {
  const { t } = useTranslation();
  const { data: bookings } = mode === 'guest' ? (useGuestBookings() as any) : (useUserBookings() as any);
  const { data: systemSettings } = useSystemSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [widgetRef, setWidgetRef] = useState<HTMLDivElement | null>(null);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [guestHiddenVersion, setGuestHiddenVersion] = useState(0);

  // Calculate strict viewport constraints based on widget state
  const getViewportConstraints = () => {
    const widgetWidth = isExpanded ? 320 : 180; // Approximate sizes
    const widgetHeight = isExpanded ? 400 : 60; // Approximate sizes
    const padding = 10; // Minimum padding from edges

    return {
      left: padding,
      right: window.innerWidth - widgetWidth - padding,
      top: padding,
      bottom: window.innerHeight - widgetHeight - padding
    };
  };
  const hideBookingMutation = useHideBookingFromWidget();
  const cancelBookingMutation = useCancelBooking();

  // Get reviewed booking IDs to hide review buttons for already reviewed bookings
  const { data: reviewedBookingIds } = useReviewedBookingIds();

  // Use the persistent widget state hook for all expansion states
  const {
    isExpanded,
    categories,
    widgetPosition,
    setIsExpanded,
    setCategoryExpanded,
    setWidgetPosition,
    isCategoryExpanded,
  } = usePersistentWidgetState({
    storageKey: 'booking-widget-state',
    defaultState: {
      isExpanded: true,
      categories: {
        activeBookings: true,
        pendingApprovals: true,
        pendingReviews: false,
        rejectedBookings: false,
        cancelledBookings: false,
        expiredBookings: false,
      },
    },
    syncAcrossTabs: true,
    debounceMs: 500, // Reasonable debounce with proper change detection
  });

  // Get default position if no stored position exists
  const getDefaultPosition = () => {
    const constraints = getViewportConstraints();
    // Default to bottom-right corner within constraints
    return {
      x: constraints.right,
      y: constraints.bottom - 100 // A bit higher than bottom
    };
  };

  // Ensure position is within viewport boundaries
  const clampToViewport = (x: number, y: number) => {
    const constraints = getViewportConstraints();
    return {
      x: Math.max(constraints.left, Math.min(x, constraints.right)),
      y: Math.max(constraints.top, Math.min(y, constraints.bottom))
    };
  };

  // Initialize widget position only once when component mounts
  useEffect(() => {
    if (!widgetPosition) {
      // Set default position if no stored position exists
      const defaultPos = getDefaultPosition();
      setWidgetPosition(defaultPos);
    } else {
      // Ensure stored position is within current viewport
      const clampedPos = clampToViewport(widgetPosition.x, widgetPosition.y);
      if (clampedPos.x !== widgetPosition.x || clampedPos.y !== widgetPosition.y) {
        setWidgetPosition(clampedPos);
      }
    }
    // Initialize animations as complete
    setAnimationsComplete(true);
  }, []); // Empty dependency array - only run once on mount

  // Expansion handler - don't allow during drag
  const handleToggleExpanded = useCallback(() => {
    if (!isDragging) {
      setIsExpanded(!isExpanded);
    }
  }, [isExpanded, setIsExpanded, isDragging]);

  // Category toggle handlers using persistent state
  const toggleCategory = useCallback((category: keyof typeof categories) => {
    setCategoryExpanded(category, !categories[category]);
  }, [categories, setCategoryExpanded]);

  // Calculate estimated height when expanded
  const calculateExpandedHeight = useCallback(() => {
    const confirmedCount = getConfirmedBookings(bookings || []).length;
    const pendingCount = bookings?.filter(booking => booking.status === 'pending').length || 0;
    const completedCount = getCompletedBookings(bookings || []).filter(booking => !reviewedBookingIds?.has(booking.id)).length || 0;
    
    // Estimate height: header (60px) + sections (each ~50px + content)
    let estimatedHeight = 60; // Header
    if (confirmedCount > 0) estimatedHeight += 50 + (confirmedCount * 80); // Active bookings section
    if (pendingCount > 0) estimatedHeight += 50 + (pendingCount * 80); // Pending approvals section
    if (completedCount > 0) estimatedHeight += 50 + (completedCount * 80); // Pending reviews section
    
    // Add some padding and ensure minimum height
    estimatedHeight = Math.max(estimatedHeight, 200);
    
    // Add extra safety margin
    estimatedHeight += 50;
    
    return estimatedHeight;
  }, [bookings, reviewedBookingIds]);

  // Remove dynamic constraint updates - use static constraints instead

  // Adjust position on window resize to keep within bounds
  useEffect(() => {
    const handleResize = () => {
      if (widgetPosition) {
        const clampedPos = clampToViewport(widgetPosition.x, widgetPosition.y);
        if (clampedPos.x !== widgetPosition.x || clampedPos.y !== widgetPosition.y) {
          setWidgetPosition(clampedPos);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [widgetPosition, setWidgetPosition, isExpanded]); // Include isExpanded as viewport constraints depend on it

  // Calculate dynamic max height for widget content based on position
  const getContentMaxHeight = () => {
    if (!widgetRef) return '60vh';
    
    const widgetRect = widgetRef.getBoundingClientRect();
    const availableHeight = window.innerHeight - widgetRect.top - 20; // 20px margin
    
    // If widget is near the bottom of the viewport, limit height more aggressively
    const distanceFromBottom = window.innerHeight - widgetRect.bottom;
    const isNearBottom = distanceFromBottom < 100; // Within 100px of bottom
    
    if (isNearBottom) {
      // When near bottom, ensure content doesn't overflow viewport
      const maxHeight = Math.max(150, availableHeight - 50); // Minimum 150px, extra margin
      return `${maxHeight}px`;
    }
    
    // If widget is in top half of screen, limit height to prevent overflow
    if (widgetRect.top < window.innerHeight / 2) {
      const maxHeight = Math.max(100, availableHeight - 100); // Reduced minimum height
      return `${maxHeight}px`;
    }
    
    // If widget is in bottom half, use viewport-relative height
    return '60vh';
  };

  // Remove position adjustment - let widget stay where user puts it

  // Check for active notifications
  useEffect(() => {
    const checkForNotifications = () => {
      const toastElements = document.querySelectorAll('[data-radix-toast-viewport] [data-state="open"]');
      setHasNotifications(toastElements.length > 0);
    };

    // Check immediately
    checkForNotifications();

    // Set up observer for toast changes
    const observer = new MutationObserver(checkForNotifications);
    const toastViewport = document.querySelector('[data-radix-toast-viewport]');
    
    if (toastViewport) {
      observer.observe(toastViewport, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-state']
      });
    }

    return () => observer.disconnect();
  }, []);

  // Remove constraint recalculation

  // Handle animation completion for smooth transitions
  useEffect(() => {
    if (widgetRef && !isDragging) {
      setAnimationsComplete(false);
      const timer = setTimeout(() => {
        setAnimationsComplete(true);
      }, 350); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [categories.activeBookings, categories.pendingApprovals, categories.pendingReviews, widgetRef, isDragging]);

  // Remove initial constraint calculation

  // Guest hidden bookings helpers (persisted locally)
  const getGuestHiddenIds = () => {
    try {
      const raw = localStorage.getItem('guestHiddenBookingIds');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set<string>();
    }
  };

  const setGuestHiddenIds = (ids: Set<string>) => {
    try {
      localStorage.setItem('guestHiddenBookingIds', JSON.stringify(Array.from(ids)));
    } catch {}
  };

  // Group bookings by status for dedicated sections
  const allBookingsUnfiltered = bookings || [];
  const guestHidden = mode === 'guest' ? getGuestHiddenIds() : new Set<string>();
  const allBookings = mode === 'guest'
    ? allBookingsUnfiltered.filter((b: any) => !guestHidden.has(String(b.id)))
    : allBookingsUnfiltered;
  
  // Active bookings (confirmed and not yet completed)
  const activeBookings = getConfirmedBookings(allBookings);
  
  // Pending bookings waiting for partner approval (exclude expired ones)
  const allPendingBookings = allBookings.filter(booking => booking.status === 'pending');
  const timeoutMinutes = systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES;
  const pendingBookings = filterNonExpiredBookings(allPendingBookings, timeoutMinutes);
  
  // Log filtering results for debugging
  if (allPendingBookings.length > 0) {
    console.log(`Customer widget pending bookings: ${allPendingBookings.length} total, ${pendingBookings.length} non-expired (timeout: ${timeoutMinutes}min)`);
  }
  
  // Rejected bookings
  const rejectedBookings = allBookings.filter(booking => booking.status === 'rejected');
  
  // Cancelled bookings
  const cancelledBookings = allBookings.filter(booking => booking.status === 'cancelled');
  
  // Completed bookings that haven't been reviewed yet
  const completedBookings = getCompletedBookings(allBookings);
  const unreviewedCompletedBookings = completedBookings
    .filter(booking => !reviewedBookingIds?.has(booking.id));
  
  // Expired bookings
  const expiredBookings = allBookings.filter(booking => booking.status === 'expired');

  // Combine all relevant bookings for total count
  const relevantBookings = [
    ...activeBookings, 
    ...pendingBookings, 
    ...rejectedBookings,
    ...cancelledBookings,
    ...unreviewedCompletedBookings,
    ...expiredBookings
  ];

  if (relevantBookings.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700';
      case 'cancelled':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-700';
      case 'completed':
        return 'bg-muted text-muted-foreground border-border dark:bg-[hsl(var(--dark-surface-3))] dark:text-[hsl(var(--text-secondary))] dark:border-[hsl(var(--border))]';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-700';
      default:
        return 'bg-muted text-muted-foreground border-border dark:bg-[hsl(var(--dark-surface-3))] dark:text-[hsl(var(--text-secondary))] dark:border-[hsl(var(--border))]';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return t('booking.pending') || 'Pending';
      case 'confirmed':
        return t('booking.confirmed') || 'Confirmed';
      case 'active':
        return t('booking.active') || 'Active';
      case 'rejected':
        return t('booking.rejected') || 'Rejected';
      case 'cancelled':
        return t('booking.cancelled') || 'Cancelled';
      case 'completed':
        return t('booking.completed') || 'Completed';
      case 'expired':
        return t('booking.expired') || 'Expired';
      default:
        return status;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Remove seconds from time format (e.g., "14:30:00" -> "14:30")
    return time.split(':').slice(0, 2).join(':');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };


  const handleCardClick = (booking: any) => {
    // Only handle click if not dragging the widget
    if (!isDragging) {
      setSelectedBooking(booking);
      setIsDialogOpen(true);
    }
  };

  const handleReviewClick = (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleRemoveBooking = async (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const bookingId = String(booking.id);
    
    try {
      if (mode === 'guest') {
        const ids = getGuestHiddenIds();
        ids.add(bookingId);
        setGuestHiddenIds(ids);
        setGuestHiddenVersion(v => v + 1);
        toast({
          title: t('bookingWidget.bookingRemoved'),
          description: t('bookingWidget.bookingRemovedDescription'),
        });
      } else {
        await hideBookingMutation.mutateAsync(bookingId);
        toast({
          title: t('bookingWidget.bookingRemoved'),
          description: t('bookingWidget.bookingRemovedDescription'),
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to hide booking from widget:', error);
      toast({
        title: t('bookingWidget.error'),
        description: t('bookingWidget.failedToRemoveBooking'),
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = async (booking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const bookingId = String(booking.id);
    
    try {
      await cancelBookingMutation.mutateAsync(bookingId);
      toast({
        title: t('booking.bookingCancelled'),
        description: t('booking.bookingCancelledDescription'),
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast({
        title: t('bookingWidget.error'),
        description: t('bookingWidget.failedToCancelBooking'),
        variant: "destructive",
      });
    }
  };


  // Dynamic positioning based on notifications
  const getPositionClasses = () => {
    if (hasNotifications) {
      // When notifications are present, move slightly down and left to avoid overlap
      return "fixed z-40";
    }
    // Default position
    return "fixed z-50";
  };

  return (
    <>
      {/* Collapsible Booking Widget */}
      <AnimatePresence>
        <motion.div
          initial={{
            opacity: 0,
            x: widgetPosition?.x ?? getDefaultPosition().x,
            y: widgetPosition?.y ?? getDefaultPosition().y
          }}
          animate={{
            opacity: 1,
            x: widgetPosition?.x ?? getDefaultPosition().x,
            y: widgetPosition?.y ?? getDefaultPosition().y
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.3 },
            x: isDragging ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 500, damping: 30 },
            y: isDragging ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }
          }}
          className={getPositionClasses()}
          data-current-booking="true"
          drag
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={getViewportConstraints()}
          onDragStart={(event, info) => {
            setIsDragging(true);
            // Store the starting position
            const currentPos = widgetPosition ?? getDefaultPosition();
            setDragStartPosition(currentPos);
            // Don't change the expanded/collapsed state while dragging
          }}
          onDragEnd={(event, info) => {
            setIsDragging(false);

            // Get the starting position
            const startPos = dragStartPosition ?? (widgetPosition ?? getDefaultPosition());

            // Calculate final position
            let finalX = startPos.x + info.offset.x;
            let finalY = startPos.y + info.offset.y;

            // Clamp to viewport boundaries
            const clampedPos = clampToViewport(finalX, finalY);

            // Save the position
            setWidgetPosition(clampedPos);
            setDragStartPosition(null);
          }}
          ref={setWidgetRef}
          style={{
            position: 'fixed',
            zIndex: isDragging ? 9999 : 50,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            willChange: isDragging ? 'transform' : 'auto',
            pointerEvents: isDragging ? 'auto' : 'auto'
          }}
        >
          <div className="flex flex-col items-end space-y-2">
            {/* Collapsed State - Toggle Button */}
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpanded();
                  }}
                  onMouseDown={(e) => {
                    // Prevent drag from starting on button click
                    e.stopPropagation();
                  }}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg rounded-full px-4 py-3 h-auto min-w-0"
                  size="sm"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Move className="h-4 w-4 opacity-80" />
                    <CalendarDays className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {relevantBookings.length} Bookings
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Expanded State - Full Widget */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className={`bg-card/95 dark:bg-[hsl(var(--dark-surface-2))]/95 backdrop-blur-sm shadow-xl dark:shadow-black/50 border border-primary/20 dark:border-primary/30 rounded-lg overflow-hidden`}
                style={{
                  width: '320px', // Fixed width to prevent size changes
                  minWidth: '320px',
                  maxWidth: '320px'
                }}
              >
                {/* Header with toggle and count */}
                <div 
                  className={`px-4 py-3 border-b border-primary/20 dark:border-primary/30 ${!isDragging ? 'cursor-grab' : 'cursor-grabbing'} bg-primary/10 dark:bg-primary/20`}
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'none'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Move className={`h-4 w-4 text-primary/60`} />
                      <CalendarDays className={`h-4 w-4 text-primary`} />
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {t('widget.yourBookings')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpanded();
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground dark:text-[hsl(var(--text-secondary))] hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))]"
                        title={t('widget.collapse')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      {onClose && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-500 hover:bg-red-50"
                          title={t('widget.close')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bookings List with dynamic height */}
                <div 
                  className="overflow-y-auto p-2 relative booking-widget-scroll"
                  style={{
                    maxHeight: '400px', // Fixed height for testing - should be scrollable
                    minHeight: 'auto',
                    width: '100%', // Ensure content doesn't exceed widget width
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Scroll indicator when content overflows - simplified */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none z-20"
                    style={{ right: '6px' }} // Account for scrollbar width
                  />
                  
                  {/* Bottom scroll indicator - simplified */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none z-20"
                    style={{ right: '6px' }} // Account for scrollbar width
                  />
                  
                  <div 
                    className="space-y-4" 
                    style={{ 
                      paddingRight: '4px' // Minimal padding to prevent overflow
                    }}
                  >

                    {/* Pending Approvals Section */}
                    {pendingBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-sm"></div>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                              {t('widget.pendingApprovals')} ({pendingBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('pendingApprovals');
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground dark:text-[hsl(var(--text-secondary))] hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] rounded-full transition-colors"
                            title={categories.pendingApprovals ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.pendingApprovals ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.pendingApprovals && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {pendingBookings.map((booking, index) => {
                              const statusInfo = getBookingStatusInfo(booking);
                              
                              return (
                                <motion.div
                                  key={booking.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                          // Removed hover effects to prevent scrollbar appearance
                                  whileTap={{ scale: 0.98 }}
                                  className="cursor-pointer touch-manipulation"
                                  onClick={() => handleCardClick(booking)}
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                    touchAction: 'manipulation'
                                  }}
                                >
                                  <Card className="bg-card border border-yellow-200 hover:border-yellow-400 hover:shadow-md transition-all duration-200 relative overflow-hidden w-full mx-0">
                                  {/* Subtle yellow accent line */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                                    <CardContent className="p-3">
                                      {/* Header with venue info */}
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                          <img
                                            src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                            alt={booking.venues?.name || 'Venue'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm font-semibold text-foreground dark:text-white truncate">
                                            {booking.venues?.name || 'Venue'}
                                          </h4>
                                          <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1">
                                            {getBookingIdDisplay(booking.id)}
                                          </div>
                                          <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5">
                                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span className="truncate">
                                              {booking.venues?.location || 'Location'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Booking details in a cleaner layout */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span>{formatDate(booking.booking_date)}</span>
                                          </div>
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                            <Clock className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span>
                                              {booking.booking_services?.[0]?.arrival_datetime 
                                                ? formatBookingTimeDisplay(
                                                    booking.booking_services[0].arrival_datetime,
                                                    booking.booking_services[0].departure_datetime
                                                  )
                                                : t('common.timeNotSet')
                                              }
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <div className="text-sm font-semibold text-primary">
                                            {booking.total_price} {t('booking.currency')}
                                          </div>
                                          <BookingTimer 
                                            createdAt={booking.created_at}
                                            status={booking.status}
                                            className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded"
                                          />
                                        </div>
                                      </div>

                                      {/* Pending approval indicator and cancel button in a cleaner layout */}
                                      <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1">
                                          <span className="mr-1">⏳</span>
                                          {t('widget.waitingForApproval')}
                                        </div>
                                        
                                        {/* Cancel button - only show for pending bookings that are not expired */}
                                        {booking.status === 'pending' && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelBooking(booking, e);
                                            }}
                                            className={`text-xs px-2 py-1 h-6 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ${
                                              cancelBookingMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                            disabled={cancelBookingMutation.isPending}
                                            title={t('widget.cancelBookingRequest')}
                                          >
                                            {cancelBookingMutation.isPending ? (
                                              <span className="flex items-center">
                                                <div className="w-3 h-3 border border-gray-300 border-t-red-500 rounded-full animate-spin mr-1"></div>
                                                {t('booking.cancelling')}
                                              </span>
                                            ) : (
                                              <span className="flex items-center">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                {t('booking.cancelRequest')}
                                              </span>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Active Bookings Section (moved below Pending Approvals) */}
                    {activeBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate dark:text-white">
                              {t('widget.activeBookings')} ({activeBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('activeBookings');
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-200"
                            title={categories.activeBookings ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.activeBookings ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.activeBookings && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {activeBookings.map((booking, index) => {
                              const statusInfo = getBookingStatusInfo(booking);
                              
                              return (
                                <motion.div
                                  key={booking.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="cursor-pointer touch-manipulation"
                                  onClick={() => handleCardClick(booking)}
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                    touchAction: 'manipulation'
                                  }}
                                >
                                  <Card className="bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 w-full mx-0">
                                    <CardContent className="p-3">
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                          <img
                                            src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                            alt={booking.venues?.name || 'Venue'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm font-semibold text-foreground dark:text-white truncate">
                                            {booking.venues?.name || 'Venue'}
                                          </h4>
                                          <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1">
                                            {getBookingIdDisplay(booking.id)}
                                          </div>
                                          <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5">
                                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span className="truncate">
                                              {booking.venues?.location || 'Location'}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveBooking(booking, e);
                                          }}
                                          className={`h-6 w-6 p-0 max-lg:h-5 max-lg:w-5 transition-all duration-200 ${
                                            hideBookingMutation.isPending
                                              ? 'text-red-500 bg-red-100 scale-110'
                                              : 'text-muted-foreground dark:text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20'
                                          }`}
                                          title={t('widget.removeFromWidget')}
                                          disabled={hideBookingMutation.isPending}
                                        >
                                          <X className="h-3 w-3 max-lg:h-2 max-lg:w-2" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span>{formatDate(booking.booking_date)}</span>
                                          </div>
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                            <Clock className="h-3 w-3 mr-1 flex-shrink-0 dark:text-gray-200" />
                                            <span>
                                              {booking.booking_services?.[0]?.arrival_datetime 
                                                ? formatBookingTimeDisplay(
                                                    booking.booking_services[0].arrival_datetime,
                                                    booking.booking_services[0].departure_datetime
                                                  )
                                                : t('common.timeNotSet')
                                              }
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <div className="text-sm font-semibold text-primary">
                                            {booking.total_price} {t('booking.currency')}
                                          </div>
                                          <Badge 
                                            variant="outline" 
                                            className={`${getStatusColor(booking.status)} border text-xs px-2 py-1`}
                                          >
                                            {getStatusText(booking.status)}
                                          </Badge>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Pending Reviews Section */}
                    {unreviewedCompletedBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                              {t('widget.awaitingReview')} ({unreviewedCompletedBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('pendingReviews');
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-200"
                            title={categories.pendingReviews ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.pendingReviews ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.pendingReviews && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {unreviewedCompletedBookings.map((booking, index) => {
                              const statusInfo = getBookingStatusInfo(booking);
                              
                              return (
                                <motion.div
                                  key={booking.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                          // Removed hover effects to prevent scrollbar appearance
                                  whileTap={{ scale: 0.98 }}
                                  className="cursor-pointer touch-manipulation"
                                  onClick={() => handleCardClick(booking)}
                                  style={{ 
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                    touchAction: 'manipulation'
                                  }}
                                >
                                  <Card className="bg-card border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 w-full mx-0">
                                    <CardContent className="p-3 max-lg:p-2">
                                      {/* Header with venue info */}
                                      <div className="flex items-center gap-3 mb-3 max-lg:gap-1 max-lg:mb-1">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm max-lg:w-6 max-lg:h-6">
                                          <img
                                            src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                            alt={booking.venues?.name || 'Venue'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm font-semibold text-foreground dark:text-white truncate max-lg:text-xs">
                                            {booking.venues?.name || 'Venue'}
                                          </h4>
                                          <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1 max-lg:text-xs">
                                            {getBookingIdDisplay(booking.id)}
                                          </div>
                                          <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5 max-lg:text-xs">
                                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0 max-lg:h-1.5 max-lg:w-1.5" />
                                            <span className="truncate">
                                              {booking.venues?.location || 'Location'}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Remove booking button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveBooking(booking, e);
                                          }}
                                          className={`h-6 w-6 p-0 max-lg:h-5 max-lg:w-5 transition-all duration-200 ${
                                            hideBookingMutation.isPending
                                              ? 'text-red-500 bg-red-100 scale-110'
                                              : 'text-muted-foreground dark:text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20'
                                          }`}
                                          title={t('widget.removeFromWidget')}
                                          disabled={hideBookingMutation.isPending}
                                        >
                                          <X className="h-3 w-3 max-lg:h-2 max-lg:w-2" />
                                        </Button>
                                      </div>

                                      {/* Booking details in a cleaner layout */}
                                      <div className="flex items-center justify-between mb-3 max-lg:mb-1">
                                        <div className="space-y-1">
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200 max-lg:text-xs">
                                            <Calendar className="h-3 w-3 mr-1 flex-shrink-0 max-lg:h-2 max-lg:w-2" />
                                            <span>{formatDate(booking.booking_date)}</span>
                                          </div>
                                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-200 max-lg:text-xs">
                                            <Clock className="h-3 w-3 mr-1 flex-shrink-0 max-lg:h-2 max-lg:w-2" />
                                            <span>
                                              {booking.booking_services?.[0]?.arrival_datetime 
                                                ? formatBookingTimeDisplay(
                                                    booking.booking_services[0].arrival_datetime,
                                                    booking.booking_services[0].departure_datetime
                                                  )
                                                : t('common.timeNotSet')
                                              }
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <div className="text-sm font-semibold text-primary max-lg:text-xs">
                                            {booking.total_price} {t('booking.currency')}
                                          </div>
                                          <Badge 
                                            variant="outline" 
                                            className="bg-muted text-muted-foreground dark:text-[hsl(var(--text-secondary))] border-border dark:border-[hsl(var(--border))] text-xs px-2 py-1 max-lg:text-xs max-lg:px-1 max-lg:py-0.5"
                                          >
                                            {t('booking.completed') || 'Completed'}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Pending review indicator */}
                                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 inline-block max-lg:mt-1 max-lg:px-1 max-lg:py-0.5 max-lg:text-xs">
                                        ⭐ Review Pending
                                      </div>

                                      {/* Review button */}
                                      <div className="mt-2 pt-2 border-t border-gray-100 max-lg:mt-1 max-lg:pt-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleReviewClick(booking, e);
                                          }}
                                          className="w-full text-xs py-1 h-7 border-orange-200 text-orange-700 hover:bg-orange-50 max-lg:h-6 max-lg:text-xs max-lg:py-0.5"
                                        >
                                          <Star className="w-3 h-3 mr-1 max-lg:w-2 max-lg:h-2" />
                                          {t('review.rateExperience') || 'Rate Experience'}
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Rejected Bookings Section */}
                    {rejectedBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                              {t('widget.rejectedBookings')} ({rejectedBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('rejectedBookings');
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-200"
                            title={categories.rejectedBookings ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.rejectedBookings ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.rejectedBookings && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {rejectedBookings.map((booking, index) => (
                              <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="cursor-pointer touch-manipulation"
                                onClick={() => handleCardClick(booking)}
                                style={{ 
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  WebkitTouchCallout: 'none',
                                  touchAction: 'manipulation'
                                }}
                              >
                                <Card className="bg-card border border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-200 relative overflow-hidden w-full mx-0">
                                  {/* Red accent line */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-red-500"></div>
                                  <CardContent className="p-3">
                                    {/* Header with venue info */}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                        <img
                                          src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                          alt={booking.venues?.name || 'Venue'}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-foreground dark:text-white truncate">
                                          {booking.venues?.name || 'Venue'}
                                        </h4>
                                        <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1">
                                          {getBookingIdDisplay(booking.id)}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5">
                                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span className="truncate">
                                            {booking.venues?.location || 'Location'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Remove booking button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveBooking(booking, e);
                                        }}
                                        className={`h-6 w-6 p-0 transition-all duration-200 ${
                                          hideBookingMutation.isPending
                                            ? 'text-red-500 bg-red-100 scale-110'
                                            : 'text-muted-foreground dark:text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20'
                                        }`}
                                        title={t('widget.removeFromWidget')}
                                        disabled={hideBookingMutation.isPending}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {/* Booking details in a cleaner layout */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>{formatDate(booking.booking_date)}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>
                                            {booking.booking_services?.[0]?.arrival_datetime 
                                              ? formatBookingTimeDisplay(
                                                  booking.booking_services[0].arrival_datetime,
                                                  booking.booking_services[0].departure_datetime
                                                )
                                              : t('common.timeNotSet')
                                            }
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-semibold text-primary">
                                          {booking.total_price} GEL
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className={`${getStatusColor(booking.status)} border text-xs px-2 py-1`}
                                        >
                                          {getStatusText(booking.status)}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Rejection message if available */}
                                    {booking.rejection_message && (
                                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                                        <span className="font-medium">Reason:</span> {booking.rejection_message}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Cancelled Bookings Section */}
                    {cancelledBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                              {t('widget.cancelledBookings')} ({cancelledBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('cancelledBookings');
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-200"
                            title={categories.cancelledBookings ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.cancelledBookings ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.cancelledBookings && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {cancelledBookings.map((booking, index) => (
                              <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="cursor-pointer touch-manipulation"
                                onClick={() => handleCardClick(booking)}
                                style={{ 
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  WebkitTouchCallout: 'none',
                                  touchAction: 'manipulation'
                                }}
                              >
                                <Card className="bg-card border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 relative overflow-hidden w-full mx-0">
                                  {/* Purple accent line */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-500"></div>
                                  <CardContent className="p-3">
                                    {/* Header with venue info */}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                        <img
                                          src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                          alt={booking.venues?.name || 'Venue'}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-foreground dark:text-white truncate">
                                          {booking.venues?.name || 'Venue'}
                                        </h4>
                                        <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1">
                                          {getBookingIdDisplay(booking.id)}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5">
                                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span className="truncate">
                                            {booking.venues?.location || 'Location'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Remove booking button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveBooking(booking, e);
                                        }}
                                        className={`h-6 w-6 p-0 transition-all duration-200 ${
                                          hideBookingMutation.isPending
                                            ? 'text-red-500 bg-red-100 scale-110'
                                            : 'text-muted-foreground dark:text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20'
                                        }`}
                                        title={t('widget.removeFromWidget')}
                                        disabled={hideBookingMutation.isPending}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {/* Booking details in a cleaner layout */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>{formatDate(booking.booking_date)}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>
                                            {booking.booking_services?.[0]?.arrival_datetime 
                                              ? formatBookingTimeDisplay(
                                                  booking.booking_services[0].arrival_datetime,
                                                  booking.booking_services[0].departure_datetime
                                                )
                                              : t('common.timeNotSet')
                                            }
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-semibold text-primary">
                                          {booking.total_price} GEL
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className={`${getStatusColor(booking.status)} border text-xs px-2 py-1`}
                                        >
                                          {getStatusText(booking.status)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Expired Bookings Section */}
                    {expiredBookings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                              {t('widget.expiredBookings')} ({expiredBookings.length})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory('expiredBookings');
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-200"
                            title={categories.expiredBookings ? t('widget.collapse') : t('widget.expand')}
                          >
                            {categories.expiredBookings ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        
                        {categories.expiredBookings && (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {expiredBookings.map((booking, index) => (
                              <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="cursor-pointer touch-manipulation"
                                onClick={() => handleCardClick(booking)}
                                style={{ 
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  WebkitTouchCallout: 'none',
                                  touchAction: 'manipulation'
                                }}
                              >
                                <Card className="bg-card border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 relative overflow-hidden w-full mx-0">
                                  {/* Orange accent line */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                                  <CardContent className="p-3">
                                    {/* Header with venue info */}
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                        <img
                                          src={booking.venues?.images?.[0] || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200"}
                                          alt={booking.venues?.name || 'Venue'}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-foreground dark:text-white truncate">
                                          {booking.venues?.name || 'Venue'}
                                        </h4>
                                        <div className="text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-1">
                                          {getBookingIdDisplay(booking.id)}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground dark:text-[hsl(var(--text-secondary))] mt-0.5">
                                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span className="truncate">
                                            {booking.venues?.location || 'Location'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Remove booking button */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveBooking(booking, e);
                                        }}
                                        className={`h-6 w-6 p-0 transition-all duration-200 ${
                                          hideBookingMutation.isPending
                                            ? 'text-red-500 bg-red-100 scale-110'
                                            : 'text-muted-foreground dark:text-[hsl(var(--text-muted))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20'
                                        }`}
                                        title={t('widget.removeFromWidget')}
                                        disabled={hideBookingMutation.isPending}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {/* Booking details in a cleaner layout */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>{formatDate(booking.booking_date)}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-200">
                                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                          <span>
                                            {booking.booking_services?.[0]?.arrival_datetime 
                                              ? formatBookingTimeDisplay(
                                                  booking.booking_services[0].arrival_datetime,
                                                  booking.booking_services[0].departure_datetime
                                                )
                                              : t('common.timeNotSet')
                                            }
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-semibold text-primary">
                                          {booking.total_price} GEL
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className={`${getStatusColor(booking.status)} border text-xs px-2 py-1`}
                                        >
                                          {getStatusText(booking.status)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Empty state */}
                    {relevantBookings.length === 0 && (
                      <div className="text-center py-8">
                        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          {t('widget.noActiveBookingsOrReviews')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Booking Details Dialog - Reusable Component */}
      <BookingDetailsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        booking={selectedBooking ? {
          id: selectedBooking.id,
          booking_date: selectedBooking.booking_date,
          total_price: selectedBooking.total_price,
          user_email: selectedBooking.user_email || 'Unknown',
          special_requests: selectedBooking.special_requests,
          rejection_message: selectedBooking.rejection_message,
          venue_name: selectedBooking.venues?.name || 'Venue',
          venue_id: selectedBooking.venue_id,
          venue_images: selectedBooking.venues?.images,
          created_at: selectedBooking.created_at,
          status: selectedBooking.status,
          booking_services: selectedBooking.booking_services
        } : null}
        showActions={false}
      />

      {/* Review Dialog */}
      {reviewBooking && (
        <ReviewDialog
          isOpen={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setReviewBooking(null);
          }}
          bookingId={reviewBooking.id}
          venueId={reviewBooking.venue_id}
          venueName={reviewBooking.venues?.name || 'Venue'}
        />
      )}
    </>
  );
};

export default CurrentBookingDisplay;