import React, { useState, useEffect, useRef } from 'react';
import { modalHistory } from '@/lib/modalHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import BookingForm from '@/components/BookingForm';
import { Venue, VenueService, useVenueServices } from '@/hooks/useVenues';
import { getServicePricingSummary, extractNumericPrice } from '@/utils/guestPricing';

interface VenueCardBookingDialogProps {
  venue: Venue;
  services?: VenueService[];
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess?: () => void;
}

const VenueCardBookingDialog: React.FC<VenueCardBookingDialogProps> = ({
  venue,
  services = [],
  isOpen,
  onClose,
  onBookingSuccess
}) => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const registrationRef = useRef<ReturnType<typeof modalHistory.register> | null>(null);
  const { data: fetchedServices } = useVenueServices(venue.id);

  // Prefer services passed from caller; fallback to freshly fetched services when not available yet
  const effectiveServices: VenueService[] = (services && services.length > 0)
    ? services
    : (fetchedServices || []);

  // Debug logging for dialog lifecycle
  useEffect(() => {
    console.log('VenueCardBookingDialog - Mounted for venue:', venue.name);
    return () => {
      console.log('VenueCardBookingDialog - Unmounted for venue:', venue.name);
    };
  }, [venue.name]);

  useEffect(() => {
    console.log('VenueCardBookingDialog - Dialog state changed:', { isOpen, venueName: venue.name });
    if (isOpen) {
      console.log('VenueCardBookingDialog - Dialog opened for venue:', venue.name);
      if (!registrationRef.current) {
        registrationRef.current = modalHistory.register(() => onClose());
      }
    } else {
      console.log('VenueCardBookingDialog - Dialog closed for venue:', venue.name);
      registrationRef.current?.unregister();
      registrationRef.current = null;
    }
  }, [isOpen, venue.name]);

  // Calculate minimum price from services
  const venuePrice = effectiveServices && effectiveServices.length > 0 ? (() => {
    const prices = services.map(service => {
      const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'));
      return extractNumericPrice(displayPrice) || service.price;
    });
    return Math.min(...prices);
  })() : 0;

  const BookingContent = () => (
    <div className="w-full h-full">
      <BookingForm 
        venueId={venue.id}
        venueName={venue.name}
        venuePrice={venuePrice}
        workingHours={venue.working_hours}
        services={effectiveServices}
        defaultDiscount={0}
        venueDiscounts={{
          overall_discount_percent: venue.overall_discount_percent,
          overall_discount_service_ids: venue.overall_discount_service_ids,
          free_hour_discounts: venue.free_hour_discounts,
          group_discounts: venue.group_discounts,
          timeslot_discounts: venue.timeslot_discounts
        }}
        onBookingSuccess={() => {
          console.log('VenueCardBookingDialog - Booking success, closing dialog');
          onBookingSuccess?.();
        }}
      />
    </div>
  );

  const handleDialogClose = (open: boolean) => {
    console.log('VenueCardBookingDialog - Dialog close requested:', { open, venueName: venue.name });
    if (!open) {
      onClose();
    }
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleDialogClose}>
        <DrawerContent className="max-h-[90vh] bg-background border-t shadow-2xl flex flex-col">
          <DrawerHeader className="flex-shrink-0 pb-2 px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-bold">
                {t('venue.bookServices')} - {venue.name}
              </DrawerTitle>
              <button
                onClick={onClose}
                className="p-1 hover:bg-accent rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
            <BookingContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border shadow-2xl bg-background text-foreground">
        <DialogHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg md:text-xl font-semibold tracking-tight">
              {t('venue.bookServices')} - {venue.name}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>
        <div className="px-6 py-5">
          <BookingContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VenueCardBookingDialog;
