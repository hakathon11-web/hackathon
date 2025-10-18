import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, MapPin, Users, Calendar, X, ExternalLink, History, EyeOff, ChevronUp, ChevronDown, CalendarDays, Star, AlertTriangle, Move } from 'lucide-react';
import { useUserBookings, useHideBookingFromWidget, useCancelBooking } from '@/hooks/useBookings';
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
}

const CurrentBookingDisplay: React.FC<CurrentBookingDisplayProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { data: bookings } = useUserBookings();
  const { data: systemSettings } = useSystemSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [widgetRef, setWidgetRef] = useState<HTMLDivElement | null>(null);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({
    left: -window.innerWidth + 320,
    right: window.innerWidth - 320,
    top: 0,
    bottom: window.innerHeight - 100
  });
  const hideBookingMutation = useHideBookingFromWidget();
  const cancelBookingMutation = useCancelBooking();

  // Get reviewed booking IDs to hide review buttons for already reviewed bookings
  const { data: reviewedBookingIds } = useReviewedBookingIds();

  // Use the persistent widget state hook
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

  // Get initial position for the widget
  const getInitialPosition = () => {
    // If we have a saved position, use it
    if (widgetPosition) {
      // Validate that the saved position is still valid for current viewport
      const widgetWidth = 320;
      const maxX = window.innerWidth - widgetWidth - 20;
      const maxY = window.innerHeight - 200; // Minimum visible height

      return {
        x: Math.min(widgetPosition.x, maxX),
        y: Math.min(widgetPosition.y, maxY),
      };
    }

    const widgetWidth = 320; // Approximate widget width

    // Estimate widget height based on content
    let estimatedHeight = 100; // Base height for collapsed state

    // If widget will be expanded, estimate the height based on content
    if (isExpanded) {
      const activeCount = getConfirmedBookings(bookings || []).length;
      const pendingCount = bookings?.filter(booking => booking.status === 'pending').length || 0;
      const rejectedCount = bookings?.filter(booking => booking.status === 'rejected').length || 0;
      const cancelledCount = bookings?.filter(booking => booking.status === 'cancelled').length || 0;
      const completedCount = getCompletedBookings(bookings || []).filter(booking => !reviewedBookingIds?.has(booking.id)).length || 0;
      const expiredCount = bookings?.filter(booking => booking.status === 'expired').length || 0;

      // Estimate height: header (60px) + sections (each ~50px + content)
      estimatedHeight = 60; // Header
      if (activeCount > 0 && isCategoryExpanded('activeBookings')) {
        estimatedHeight += 50 + (activeCount * 80);
      }
      if (pendingCount > 0 && isCategoryExpanded('pendingApprovals')) {
        estimatedHeight += 50 + (pendingCount * 80);
      }
      if (rejectedCount > 0 && isCategoryExpanded('rejectedBookings')) {
        estimatedHeight += 50 + (rejectedCount * 80);
      }
      if (cancelledCount > 0 && isCategoryExpanded('cancelledBookings')) {
        estimatedHeight += 50 + (cancelledCount * 80);
      }
      if (completedCount > 0 && isCategoryExpanded('pendingReviews')) {
        estimatedHeight += 50 + (completedCount * 80);
      }
      if (expiredCount > 0 && isCategoryExpanded('expiredBookings')) {
        estimatedHeight += 50 + (expiredCount * 80);
      }

      // Add some padding and ensure minimum height
      estimatedHeight = Math.max(estimatedHeight, 200);

      // Add extra safety margin for expanded state
      estimatedHeight += 50;
    }

    // Calculate position to ensure widget is fully visible
    const x = window.innerWidth - widgetWidth - 20; // 20px margin from right

    // More conservative positioning: ensure widget is fully visible with extra margin
    const maxY = window.innerHeight - estimatedHeight - 40; // 40px margin from bottom for safety
    let y = Math.max(20, maxY); // At least 20px from top

    // Safety check: never start too low (ensure at least 60% of viewport height is available)
    const minY = window.innerHeight * 0.4; // Start at 40% down the viewport at most
    y = Math.min(y, minY);

    return { x, y };
  };

  // Initialize widget position
  useEffect(() => {
    const initialPos = getInitialPosition();
    if (!widgetPosition) {
      setWidgetPosition(initialPos);
    }
    // Initialize animations as complete
    setAnimationsComplete(true);
  }, [hasNotifications]);

  // Smart expansion handler to prevent content overflow
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded, setIsExpanded]);

  // Handle drag end to save position
  const handleDragEnd = useCallback((event: any, info: any) => {
    setIsDragging(false);
    const newPosition = {
      x: info.point.x,
      y: info.point.y,
    };
    setWidgetPosition(newPosition);
  }, [setWidgetPosition]);

  // Category toggle handlers
  const toggleCategory = useCallback((category: keyof typeof categories) => {
    setCategoryExpanded(category, !categories[category]);
  }, [categories, setCategoryExpanded]);

  // Filter bookings by status
  const confirmedBookings = getConfirmedBookings(bookings || []);
  const pendingBookings = filterNonExpiredBookings(
    bookings?.filter(booking => booking.status === 'pending') || [],
    systemSettings?.booking_timeout_minutes || BOOKING_TIMEOUT_MINUTES
  );
  const rejectedBookings = bookings?.filter(booking => booking.status === 'rejected') || [];
  const cancelledBookings = bookings?.filter(booking => booking.status === 'cancelled') || [];
  const expiredBookings = bookings?.filter(booking => booking.status === 'expired') || [];
  const completedBookings = getCompletedBookings(bookings || []).filter(
    booking => !reviewedBookingIds?.has(booking.id)
  );

  // Rest of your component logic remains the same...
  // (I'm showing the key parts that demonstrate the integration)

  return (
    <>
      <AnimatePresence>
        {!isDialogOpen && (
          <motion.div
            ref={setWidgetRef}
            drag={!isDragging}
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            dragConstraints={dragConstraints}
            initial={{ opacity: 0, scale: 0.8, x: widgetPosition?.x || 0, y: widgetPosition?.y || 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: widgetPosition?.x || 0,
              y: widgetPosition?.y || 0
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed z-50 w-80 bg-card dark:bg-[hsl(var(--dark-surface-2))] rounded-lg shadow-xl border border-border dark:border-[hsl(var(--border))]"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('booking.yourBookings', 'Your Bookings')}
                </h3>
                {hasNotifications && (
                  <Badge className="bg-red-500 text-white animate-pulse">New</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleExpanded}
                  className="h-8 w-8"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Widget Content */}
            {isExpanded && (
              <div className="max-h-[500px] overflow-y-auto">
                {/* Active Bookings Section */}
                {confirmedBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('activeBookings')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-sm">
                          {t('booking.activeBookings', 'Active Bookings')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {confirmedBookings.length}
                        </Badge>
                      </div>
                      {categories.activeBookings ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.activeBookings && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Approvals Section */}
                {pendingBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('pendingApprovals')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-sm">
                          {t('booking.pendingApprovals', 'Pending Approvals')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {pendingBookings.length}
                        </Badge>
                      </div>
                      {categories.pendingApprovals ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.pendingApprovals && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Reviews Section */}
                {completedBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('pendingReviews')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-sm">
                          {t('booking.pendingReviews', 'Pending Reviews')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {completedBookings.length}
                        </Badge>
                      </div>
                      {categories.pendingReviews ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.pendingReviews && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Bookings Section */}
                {rejectedBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('rejectedBookings')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-sm">
                          {t('booking.rejectedBookings', 'Rejected Bookings')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {rejectedBookings.length}
                        </Badge>
                      </div>
                      {categories.rejectedBookings ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.rejectedBookings && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancelled Bookings Section */}
                {cancelledBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('cancelledBookings')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                        <span className="font-medium text-sm">
                          {t('booking.cancelledBookings', 'Cancelled Bookings')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {cancelledBookings.length}
                        </Badge>
                      </div>
                      {categories.cancelledBookings ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.cancelledBookings && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Expired Bookings Section */}
                {expiredBookings.length > 0 && (
                  <div className="border-b border-border dark:border-[hsl(var(--border))]">
                    <button
                      onClick={() => toggleCategory('expiredBookings')}
                      className="flex items-center justify-between w-full p-3 hover:bg-muted dark:hover:bg-[hsl(var(--dark-surface-3))] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-sm">
                          {t('booking.expiredBookings', 'Expired Bookings')}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {expiredBookings.length}
                        </Badge>
                      </div>
                      {categories.expiredBookings ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[hsl(var(--text-secondary))]" />
                      )}
                    </button>
                    {categories.expiredBookings && (
                      <div className="px-3 pb-3 space-y-2">
                        {/* Booking items here */}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {confirmedBookings.length === 0 &&
                 pendingBookings.length === 0 &&
                 completedBookings.length === 0 &&
                 rejectedBookings.length === 0 &&
                 cancelledBookings.length === 0 &&
                 expiredBookings.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground dark:text-[hsl(var(--text-secondary))]">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground dark:text-[hsl(var(--text-muted))]" />
                    <p className="text-sm">{t('booking.noBookings', 'No bookings to display')}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
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

      {selectedBooking && (
        <BookingDetailsDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
        />
      )}
    </>
  );
};

export default CurrentBookingDisplay;