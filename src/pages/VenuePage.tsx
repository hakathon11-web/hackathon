import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyticsEvents } from "@/lib/analytics";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem
} from "@/components/ui/carousel";
import { 
  Star, 
  MapPin, 
  ArrowLeft,
  ArrowRight,
  Percent,
  Users,
  Clock,
  Gift
} from "lucide-react";
import { Link } from "react-router-dom";
import { useVenue, useVenueServices, VenueService } from "@/hooks/useVenues";
import BookingForm from "@/components/BookingForm";
import ServiceDiscountBanner from "@/components/ServiceDiscountBanner";
import ReviewsList from "@/components/ReviewsList";
import { getServicePricingSummary, extractNumericPrice } from "@/utils/guestPricing";
import { isVenueOpenNow, isVenueBookableNow } from "@/utils/workingHours";
import { getVenueDiscountInfo } from "@/utils/venuePricing";
import VenueDiscountIndicator from "@/components/VenueDiscountIndicator";
import SEO from "@/components/SEO";
import { generateVenueStructuredData, generateBreadcrumbStructuredData } from "@/utils/structuredData";

import { useState, useEffect } from "react";
import { CarouselApi } from "@/components/ui/carousel";

const VenuePage = () => {
  const { t, i18n } = useTranslation();

  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as any;
  // Restore booking data after OAuth if present
  let initialBookingData = locationState?.bookingData;
  try {
    const pending = localStorage.getItem('pendingBookingData');
    if (pending) {
      const parsed = JSON.parse(pending);
      if (!initialBookingData) {
        initialBookingData = parsed;
      }
    }
  } catch {}
  const [selectedService, setSelectedService] = useState<VenueService | undefined>();
  const [shouldAutoOpenBooking, setShouldAutoOpenBooking] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [desktopCurrent, setDesktopCurrent] = useState(0);
  
  const { data: venue, isLoading: venueLoading, error: venueError } = useVenue(id!);
  const { data: services, isLoading: servicesLoading } = useVenueServices(id!);

  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);

  // Get discount icon based on type
  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'overall':
        return Percent;
      case 'group':
        return Users;
      case 'timeslot':
        return Clock;
      case 'freeHours':
        return Gift;
      default:
        return Percent;
    }
  };

  // Track venue view
  useEffect(() => {
    if (venue && id) {
      analyticsEvents.venueViewed(id, venue.name);
    }
  }, [venue, id]);

  // Ensure page scrolls to top when venue page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    setDesktopCurrent(desktopApi.selectedScrollSnap());

    desktopApi.on("select", () => {
      setDesktopCurrent(desktopApi.selectedScrollSnap());
    });
  }, [desktopApi]);

  // Check if venue is currently closed (not bookable due to time constraints)
  const isCurrentlyClosed = venue ? !isVenueBookableNow(venue.working_hours) : false;

  // Check for pending booking data when returning from auth
  useEffect(() => {
    const pendingBookingData = localStorage.getItem('pendingBookingData');
    const pendingBookingDialog = localStorage.getItem('pendingBookingDialog');
    
    if (pendingBookingData && pendingBookingDialog === 'true' && id) {
      try {
        const bookingData = JSON.parse(pendingBookingData);
        // Check if this is the same venue
        if (bookingData.venueId === id) {
          setShouldAutoOpenBooking(true);
          // Clear the pending data
          localStorage.removeItem('pendingBookingData');
          localStorage.removeItem('pendingBookingDialog');
        }
      } catch (error) {
        console.error('Error parsing pending booking data:', error);
        localStorage.removeItem('pendingBookingData');
        localStorage.removeItem('pendingBookingDialog');
      }
    }
  }, [id]);

  if (venueLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="responsive-container py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-96 bg-muted rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded" />
              </div>
              <div className="h-96 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (venueError || !venue) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('venue.notFound')}</h1>
          <Link to="/">
            <Button>{t('common.returnHome')}</Button>
          </Link>
        </div>
      </div>
    );
  }


  // Prepare SEO data
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  const venueTitle = `${venue.name} - Book Now | Dajavshne`;
  const venueDescription = venue.description 
    ? `${venue.description.substring(0, 155)}...` 
    : `Book ${venue.name} on Dajavshne. Rating: ${venue.rating}/5 (${venue.review_count} reviews). ${venue.location}. Gaming venue in Georgia with easy online booking.`;
  
  const venueImage = venue.images && venue.images.length > 0 
    ? venue.images[0] 
    : `${siteUrl}/favicon_logoai/android-chrome-512x512.png`;
  
  // Calculate price range for structured data
  const priceRange = services && services.length > 0 
    ? (() => {
        const prices = services.map(s => s.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? `${min} GEL` : `${min}-${max} GEL`;
      })()
    : undefined;

  // Generate structured data
  const venueStructuredData = generateVenueStructuredData({
    id: venue.id,
    name: venue.name,
    description: venue.description,
    address: venue.location,
    latitude: venue.latitude,
    longitude: venue.longitude,
    phone: venue.phone_number,
    images: venue.images,
    rating: venue.rating,
    reviewCount: venue.review_count,
    priceRange,
  }, siteUrl);

  // Generate breadcrumb structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
    { name: venue.name, url: `/venue/${venue.id}` },
  ], siteUrl);

  const keywords = [
    venue.name,
    'gaming venue',
    'book gaming venue',
    'Georgia gaming',
    venue.location,
    ...(services?.map(s => s.name) || []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={venueTitle}
        description={venueDescription}
        canonical={`${siteUrl}/venue/${venue.id}`}
        ogType="business.business"
        ogImage={venueImage}
        ogImageAlt={`${venue.name} - Gaming venue in Georgia`}
        keywords={keywords}
        structuredData={[venueStructuredData, breadcrumbData]}
      />
      
      {/* Header Navigation */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('venue.backToVenues')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 pb-8">
        {/* Service Discount Banner - Desktop Only */}
        <div className="hidden lg:block">
          <ServiceDiscountBanner 
            services={services || []}
            selectedService={selectedService}
            className="mb-6"
          />
        </div>
        
        {/* Mobile Layout - Venue Content First */}
        <div className={`lg:hidden space-y-6 ${isCurrentlyClosed ? 'opacity-60 grayscale' : ''}`}>
          {/* Title and Actions */}
          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{venue.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium text-foreground">{venue.rating}</span>
                <span>·</span>
                <span className="underline hover:text-foreground transition-colors cursor-pointer">{venue.review_count} {t('venue.reviews')}</span>
              </div>
              <div className="hidden sm:block">·</div>
              <button
                onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(venue.location)}`, '_blank')}
                className="flex items-center gap-1 hover:text-foreground transition-colors w-fit"
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="underline truncate max-w-[200px] sm:max-w-none">{venue.location}</span>
              </button>
            </div>
          </div>

          {/* Image Gallery with Discount Badges */}
          <div className="rounded-xl overflow-hidden bg-card relative group">
            <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
              <CarouselContent>
                {venue.images?.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <img
                        src={image}
                        alt={`${venue.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Discount Badges - Top Right (Mobile) */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        {discountInfo.hasDiscount && (
                          <div className="bg-green-600 text-white rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-pulse dark:bg-green-500 dark:shadow-green-500/20 px-3 py-1.5">
                            {React.createElement(getDiscountIcon(discountInfo.bestDiscount?.type || 'overall'), { 
                              className: "h-3.5 w-3.5" 
                            })}
                            <span className="font-semibold text-sm">
                              {discountInfo.bestDiscount?.label}
                            </span>
                          </div>
                        )}
                        {/* Venue-level aggregate badges */}
                        <VenueDiscountIndicator venueDiscounts={venue} className="text-sm" />
                      </div>
                      
                    </div>
                  </CarouselItem>
                )) || (
                  <CarouselItem>
                    <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center">
                      <span className="text-muted-foreground">{t('venue.noImages')}</span>
                    </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              {/* Custom Arrows (match VenueCard) */}
              {venue.images && venue.images.length > 1 && (
                <>
                  <button
                    onClick={() => api?.scrollPrev()}
                    className="absolute top-1/2 -translate-y-1/2 left-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 w-9 h-9"
                    style={{ minWidth: '36px', minHeight: '36px' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => api?.scrollNext()}
                    className="absolute top-1/2 -translate-y-1/2 right-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 w-9 h-9"
                    style={{ minWidth: '36px', minHeight: '36px' }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </Carousel>
            
              {/* Dot Indicators */}
              {venue.images && venue.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                  {venue.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`rounded-full transition-all duration-200 ${
                        index === current
                          ? 'bg-white w-2 h-2'
                          : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
          </div>


        </div>

        {/* Mobile Booking Form */}
        <div className="lg:hidden">
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 sm:p-6 shadow-xl glass-effect ring-2 ring-primary/10">
            <BookingForm 
              venueId={venue.id}
              venueName={venue.name}
              venuePrice={services && services.length > 0 ? (() => {
                const prices = services.map(service => {
                  const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka');
                  return extractNumericPrice(displayPrice) || service.price;
                });
                return Math.min(...prices);
              })() : 0}
              defaultDiscount={0}
              workingHours={venue.working_hours}
              services={services}
              selectedServiceId={selectedService?.id}
              initialBookingData={initialBookingData}
              shouldAutoOpenBooking={shouldAutoOpenBooking}
              maxBookingDaysInAdvance={venue.max_booking_days_in_advance}
              venueDiscounts={{
                overall_discount_percent: venue.overall_discount_percent,
                overall_discount_service_ids: venue.overall_discount_service_ids,
                free_hour_discounts: venue.free_hour_discounts,
                group_discounts: venue.group_discounts,
                timeslot_discounts: venue.timeslot_discounts
              }}
            />
          </div>
          
          {/* Mobile Reviews Section - Below Booking Form */}
          <div className="mt-6 space-y-4">
            <ReviewsList venueId={venue.id} />
          </div>

        </div>

        {/* Desktop Layout - Airbnb Style */}
        <div className="hidden lg:grid grid-cols-12 gap-8 min-h-[calc(100vh-200px)]">
          
          {/* Left Side - Stationary Content */}
          <div className="lg:col-span-7 h-full overflow-hidden">
            <div className={`h-full overflow-y-auto pr-4 space-y-8 ${isCurrentlyClosed ? 'opacity-60 grayscale' : ''}`}>
              
              {/* Title and Actions */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-semibold text-foreground mb-2">{venue.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium text-foreground">{venue.rating}</span>
                      <span>·</span>
                      <span className="underline hover:text-foreground transition-colors cursor-pointer">{venue.review_count} {t('venue.reviews')}</span>
                    </div>
                    <span>·</span>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(venue.location)}`, '_blank')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors w-fit"
                    >
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="underline max-w-[300px] truncate">{venue.location}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              <div className="rounded-xl overflow-hidden bg-card relative group">
                <Carousel className="w-full" setApi={setDesktopApi} opts={{ loop: true }}>
                  <CarouselContent>
                    {venue.images?.map((image, index) => (
                      <CarouselItem key={index}>
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img
                            src={image}
                            alt={`${venue.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Discount Badges - Top Right (Desktop) */}
                          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                            {discountInfo.hasDiscount && (
                              <div className="bg-green-600 text-white rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-pulse dark:bg-green-500 dark:shadow-green-500/20 px-3 py-1.5">
                                {React.createElement(getDiscountIcon(discountInfo.bestDiscount?.type || 'overall'), { 
                                  className: "h-3.5 w-3.5" 
                                })}
                                <span className="font-semibold text-sm">
                                  {discountInfo.bestDiscount?.label}
                                </span>
                              </div>
                            )}
                            {/* Venue-level aggregate badges */}
                            <VenueDiscountIndicator venueDiscounts={venue} className="text-sm" />
                          </div>
                        </div>
                      </CarouselItem>
                    )) || (
                      <CarouselItem>
                        <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center">
                          <span className="text-muted-foreground">{t('venue.noImages')}</span>
                        </div>
                      </CarouselItem>
                    )}
                  </CarouselContent>
              
                  {/* Custom Arrows (match VenueCard) */}
                  {venue.images && venue.images.length > 1 && (
                    <>
                      <button
                        onClick={() => desktopApi?.scrollPrev()}
                        className="absolute top-1/2 -translate-y-1/2 left-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 w-9 h-9"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => desktopApi?.scrollNext()}
                        className="absolute top-1/2 -translate-y-1/2 right-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 w-9 h-9"
                        style={{ minWidth: '36px', minHeight: '36px' }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </Carousel>
                
                {/* Dot Indicators */}
                {venue.images && venue.images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                    {venue.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => desktopApi?.scrollTo(index)}
                        className={`rounded-full transition-all duration-200 ${
                          index === desktopCurrent
                            ? 'bg-white w-2 h-2'
                            : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="space-y-4">
                <ReviewsList venueId={venue.id} />
              </div>

            </div>
          </div>

          {/* Right Side - Booking Form */}
          <div className="lg:col-span-5 h-full flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pb-20">
              
              {/* Price and Basic Info - Enhanced prominence */}
              <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl glass-effect ring-2 ring-primary/10 hover:ring-primary/20 transition-all duration-300">
                
                <BookingForm 
                  venueId={venue.id}
                  venueName={venue.name}
                  venuePrice={services && services.length > 0 ? (() => {
                    const prices = services.map(service => {
                      const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka');
                      return extractNumericPrice(displayPrice) || service.price;
                    });
                    return Math.min(...prices);
                  })() : 0}
                  defaultDiscount={0}
                  workingHours={venue.working_hours}
                  services={services}
                  selectedServiceId={selectedService?.id}
                  initialBookingData={initialBookingData}
                  maxBookingDaysInAdvance={venue.max_booking_days_in_advance}
                  venueDiscounts={{
                    overall_discount_percent: venue.overall_discount_percent,
                    overall_discount_service_ids: venue.overall_discount_service_ids,
                    free_hour_discounts: venue.free_hour_discounts,
                    group_discounts: venue.group_discounts,
                    timeslot_discounts: venue.timeslot_discounts
                  }}
                  shouldAutoOpenBooking={shouldAutoOpenBooking}
                />
              </div>




            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenuePage;
