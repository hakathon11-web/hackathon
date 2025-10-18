import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import { useGuestBookings } from '@/hooks/useGuestBookings';
import { usePersistentWidgetState } from '@/hooks/usePersistentWidgetState';
import { format } from 'date-fns';

const GuestBookingDisplay: React.FC = () => {
  const { t } = useTranslation();
  const { data: bookings = [] } = useGuestBookings();

  const {
    isExpanded,
    categories,
    widgetPosition,
    setIsExpanded,
    setCategoryExpanded,
    setWidgetPosition,
    isCategoryExpanded,
  } = usePersistentWidgetState({
    storageKey: 'guest-booking-widget-state',
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
    debounceMs: 500,
  });

  const confirmed = useMemo(() => bookings.filter((b: any) => b.status === 'confirmed'), [bookings]);
  const pending = useMemo(() => bookings.filter((b: any) => b.status === 'pending'), [bookings]);
  const rejected = useMemo(() => bookings.filter((b: any) => b.status === 'rejected'), [bookings]);
  const cancelled = useMemo(() => bookings.filter((b: any) => b.status === 'cancelled'), [bookings]);
  const expired = useMemo(() => bookings.filter((b: any) => b.status === 'expired'), [bookings]);

  const relevant = [...confirmed, ...pending, ...rejected, ...cancelled, ...expired];
  if (relevant.length === 0) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return t('booking.status.confirmed');
      case 'pending': return t('booking.status.pending');
      case 'rejected': return t('booking.status.rejected');
      case 'cancelled': return t('booking.status.cancelled');
      case 'expired': return t('booking.status.expired');
      default: return status;
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const { x, y } = info.point || { x: 0, y: 0 };
    setWidgetPosition({ x, y });
  };

  const Section = ({ title, items, categoryKey }: { title: string; items: any[]; categoryKey: any }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCategoryExpanded(categoryKey, !isCategoryExpanded(categoryKey))}
          className="h-8 px-2 text-xs"
        >
          {isCategoryExpanded(categoryKey) ? (
            <><ChevronUp className="w-4 h-4 mr-1" />{t('widget.collapse') || 'Collapse'}</>
          ) : (
            <><ChevronDown className="w-4 h-4 mr-1" />{t('widget.expand') || 'Expand'}</>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {isCategoryExpanded(categoryKey) && items.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="space-y-2">
              {items.map((booking: any) => (
                <Card key={booking.id} className="border border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium truncate">{booking.venues?.name || t('booking.venue')}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(booking.booking_date), 'yyyy-MM-dd')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{booking.total_price} GEL</span>
                        <Badge variant="outline" className={`${getStatusColor(booking.status)} border text-xs px-2 py-1`}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.9, x: widgetPosition?.x || 0, y: widgetPosition?.y || 0 }}
        animate={{ opacity: 1, scale: 1, x: widgetPosition?.x || 0, y: widgetPosition?.y || 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25 }}
        className="fixed z-50 w-80 bg-card dark:bg-[hsl(var(--dark-surface-2))] rounded-lg shadow-xl border border-border"
        style={{ cursor: 'grab' }}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-semibold">{t('widget.myBookings') || 'My bookings'}</div>
              <div className="text-xs text-muted-foreground">{t('widget.guestSession') || 'Guest session'}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 px-2 text-xs">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="p-3 space-y-4">
                {confirmed.length > 0 && (
                  <Section title={t('widget.activeBookings') || 'Active bookings'} items={confirmed} categoryKey={'activeBookings'} />
                )}
                {pending.length > 0 && (
                  <Section title={t('widget.pendingApprovals') || 'Pending approvals'} items={pending} categoryKey={'pendingApprovals'} />
                )}
                {rejected.length > 0 && (
                  <Section title={t('widget.rejectedBookings') || 'Rejected'} items={rejected} categoryKey={'rejectedBookings'} />
                )}
                {cancelled.length > 0 && (
                  <Section title={t('widget.cancelledBookings') || 'Cancelled'} items={cancelled} categoryKey={'cancelledBookings'} />
                )}
                {expired.length > 0 && (
                  <Section title={t('widget.expiredBookings') || 'Expired'} items={expired} categoryKey={'expiredBookings'} />
                )}

                {/* Link to booking history guest filter if needed */}
                <div className="pt-1">
                  <Button variant="link" className="px-0 text-xs" onClick={() => { window.location.href = '/booking-history'; }}>
                    {t('widget.viewAll') || 'View all'} <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuestBookingDisplay;


