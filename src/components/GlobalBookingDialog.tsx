import React from 'react';
import { useGlobalBookingDialog } from '@/hooks/useGlobalBookingDialog';
import VenueCardBookingDialog from '@/components/VenueCardBookingDialog';

const GlobalBookingDialog: React.FC = () => {
  const { isOpen, venue, services, closeDialog } = useGlobalBookingDialog();

  if (!venue || !isOpen) {
    return null;
  }

  return (
    <VenueCardBookingDialog
      venue={venue}
      services={services || []}
      isOpen={isOpen}
      onClose={closeDialog}
      onBookingSuccess={closeDialog}
    />
  );
};

export default GlobalBookingDialog;
