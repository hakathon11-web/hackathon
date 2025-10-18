import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageCircle } from 'lucide-react';
import { useVenueReviews, type Review } from '@/hooks/useReviews';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ReviewsListProps {
  venueId: string;
  className?: string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ venueId, className = '' }) => {
  const { t } = useTranslation();
  const { data: reviews, isLoading, error } = useVenueReviews(venueId);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= rating;
      
      return (
        <Star
          key={index}
          className={`w-4 h-4 ${
            isFilled ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      );
    });
  };

  const getInitials = (name: string) => {
    // If it's an email, use the part before @
    if (name.includes('@')) {
      const emailPart = name.split('@')[0];
      return emailPart.slice(0, 2).toUpperCase();
    }
    
    // Otherwise treat as name
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t('reviews.reviews') || 'Reviews'}</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t('reviews.reviews') || 'Reviews'}</h3>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {t('review.errorLoading') || 'Error loading reviews'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t('reviews.reviews') || 'Reviews'}</h3>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {t('reviews.noReviews') || 'No reviews yet. Be the first to review this venue!'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="text-lg font-semibold">
          {t('review.reviews') || 'Reviews'} ({reviews.length})
        </h3>
      </div>
      
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.profiles?.avatar_url} />
                  <AvatarFallback className="text-sm">
                    {getInitials(review.profiles?.email || 'User')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {review.profiles?.email || t('review.anonymous') || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-muted-foreground ml-1">
                      {review.rating}/5
                    </span>
                  </div>
                  
                  {review.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
