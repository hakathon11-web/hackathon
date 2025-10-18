import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import ReviewForm from './ReviewForm';
import { useUserReviewForBooking, type Review } from '@/hooks/useReviews';
import { useTranslation } from 'react-i18next';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  venueId: string;
  venueName: string;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onClose,
  bookingId,
  venueId,
  venueName
}) => {
  const { t } = useTranslation();
  const { data: existingReview, isLoading } = useUserReviewForBooking(bookingId);

  const handleSuccess = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              {t('review.loading') || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <ReviewForm
          venueId={venueId}
          bookingId={bookingId}
          venueName={venueName}
          existingReview={existingReview}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
