import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Send, Edit } from 'lucide-react';
import { useCreateReview, useUpdateReview, type Review } from '@/hooks/useReviews';
import { useTranslation } from 'react-i18next';

interface ReviewFormProps {
  venueId: string;
  bookingId: string;
  venueName: string;
  existingReview?: Review | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  venueId,
  bookingId,
  venueName,
  existingReview,
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [hoveredRating, setHoveredRating] = useState(0);

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const isSubmitting = createReview.isPending || updateReview.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    try {
      if (existingReview) {
        await updateReview.mutateAsync({
          id: existingReview.id,
          rating,
          comment: comment.trim() || null,
        });
      } else {
        await createReview.mutateAsync({
          venue_id: venueId,
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        });
      }
      
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={index}
          type="button"
          className={`p-1 transition-colors ${
            isFilled ? 'text-yellow-400' : 'text-gray-300'
          } hover:text-yellow-400`}
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
        >
          <Star className="w-6 h-6 fill-current" />
        </button>
      );
    });
  };

  const getRatingText = () => {
    if (rating === 0) return t('review.selectRating') || 'Select a rating';
    if (rating === 1) return t('review.terrible') || 'Terrible';
    if (rating === 2) return t('review.poor') || 'Poor';
    if (rating === 3) return t('review.average') || 'Average';
    if (rating === 4) return t('review.good') || 'Good';
    if (rating === 5) return t('review.excellent') || 'Excellent';
    return '';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {existingReview ? (
            <>
              <Edit className="w-5 h-5" />
              {t('review.editReview') || 'Edit Review'}
            </>
          ) : (
            <>
              <Star className="w-5 h-5 text-yellow-400" />
              {t('review.writeReview') || 'Write a Review'}
            </>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('review.forVenue') || 'for'} <span className="font-medium">{venueName}</span>
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('review.yourRating') || 'Your Rating'}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex">
                {renderStars()}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {getRatingText()}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              {t('review.comment') || 'Comment'} ({t('review.optional') || 'optional'})
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('review.shareExperience') || "Share your experience..."}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
            )}
            <Button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.submitting') || 'Submitting...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {existingReview ? (
                    <>
                      <Edit className="w-4 h-4" />
                      {t('common.update') || 'Update'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('review.submit') || 'Submit Review'}
                    </>
                  )}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
