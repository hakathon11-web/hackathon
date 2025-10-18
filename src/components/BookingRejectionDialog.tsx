import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BookingRejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  bookingId: string;
  venueName?: string;
  isLoading?: boolean;
}

const BookingRejectionDialog: React.FC<BookingRejectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  venueName,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const handleConfirm = () => {
    if (isRequired && !rejectionMessage.trim()) {
      return; // Don't proceed if message is required but empty
    }
    onConfirm(rejectionMessage.trim());
  };

  const handleClose = () => {
    setRejectionMessage('');
    setIsRequired(false);
    onClose();
  };

  const commonRejectionReasons = [
    t('booking.rejection.fullyBooked') || 'We are fully booked for this time slot',
    t('booking.rejection.insufficientNotice') || 'Insufficient advance notice for this booking',
    t('booking.rejection.specialEvent') || 'We have a special event during this time',
    t('booking.rejection.maintenance') || 'Maintenance scheduled during requested time',
    t('booking.rejection.staffing') || 'Insufficient staffing for this time period',
  ];

  const handleQuickSelect = (reason: string) => {
    setRejectionMessage(reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {t('booking.rejection.title') || 'Reject Booking Request'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              {t('booking.rejection.description') || 'You are about to reject this booking request. A message explaining the reason will be sent to the customer.'}
              {venueName && (
                <span className="block mt-1 font-medium">
                  {t('venue.name')}: {venueName}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejection-message" className="flex items-center justify-between">
              <span>{t('booking.rejection.messageLabel') || 'Reason for rejection'}</span>
              <span className="text-xs text-gray-500">
                {t('common.optional')} ({rejectionMessage.length}/500)
              </span>
            </Label>
            
            <Textarea
              id="rejection-message"
              placeholder={t('booking.rejection.messagePlaceholder') || 'Please provide a reason for rejecting this booking request...'}
              value={rejectionMessage}
              onChange={(e) => setRejectionMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Quick selection buttons for common reasons */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              {t('booking.rejection.quickReasons') || 'Common reasons (click to use):'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {commonRejectionReasons.map((reason, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(reason)}
                  className="text-xs h-8 px-3 hover:bg-gray-50"
                  type="button"
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              id="require-message"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="require-message" className="cursor-pointer">
              {t('booking.rejection.requireMessage') || 'Require rejection message'}
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || (isRequired && !rejectionMessage.trim())}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('booking.rejection.processing') || 'Rejecting...'}
              </div>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                {t('booking.rejection.confirm') || 'Reject Booking'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingRejectionDialog;
