import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, ArrowLeft, Clock, Percent, Users, Gift } from "lucide-react";
import { Venue, useVenueServices } from "@/hooks/useVenues";
import { getServicePricingSummary, extractNumericPrice } from "@/utils/guestPricing";
import { getVenueDiscountInfo } from "@/utils/venuePricing";
import VenueDiscountIndicator from "@/components/VenueDiscountIndicator";
import { motion } from "framer-motion";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useServiceTranslation } from "@/utils/serviceTranslation";
import { formatWorkingHours, getTodaySchedule, getTodayScheduleDisplay, isVenueOpenNow, isVenueBookableNow } from '@/utils/workingHours';
import { useGlobalBookingDialog } from '@/hooks/useGlobalBookingDialog';
import { clearPendingBookingContext } from '@/lib/pendingBooking';

interface VenueCardProps {
  venue: Venue;
  compact?: boolean;
  searchMode?: boolean;
  onHover?: (venue: Venue) => void;
  onHoverEnd?: () => void;
}

const VenueCard = ({ venue, compact = false, searchMode = false, onHover, onHoverEnd }: VenueCardProps) => {
  const { t, i18n } = useTranslation();
  const { translateService } = useServiceTranslation();
  const navigate = useNavigate();
  const { data: services } = useVenueServices(venue.id);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { openDialog } = useGlobalBookingDialog();

  // Dynamic chip fitting
  const chipsContainerRef = useRef<HTMLDivElement | null>(null);
  const chipsMeasureRef = useRef<HTMLDivElement | null>(null);
  const [visibleChipCount, setVisibleChipCount] = useState<number | null>(null);
  const chipLabels: string[] = services && services.length > 0
    ? services.map(s => translateService({
        name: s.services?.name || 'Unknown Service',
        name_en: s.services?.name_en,
        name_ka: s.services?.name_ka
      }))
    : ['Gaming'];

  // If user returns from OAuth during booking, decide how to resume
  useEffect(() => {
    try {
      const pendingBookingData = localStorage.getItem('pendingBookingData');
      const pendingBookingDialog = localStorage.getItem('pendingBookingDialog');
      if (pendingBookingData && pendingBookingDialog === 'true') {
        const data = JSON.parse(pendingBookingData);
        if (data?.venueId === venue.id) {
          // If flow indicates to resume at payment, defer to VenuePage which opens payment dialog
          if (data?.resumeAt === 'payment') {
            // Navigate to the venue page so VenuePage can open the payment dialog immediately
            navigate(`/venue/${venue.id}`, { state: { bookingData: data } });
          } else {
            // Default behaviour: reopen booking dialog
            openDialog(venue, services || []);
          }
          // Clear only when we handled the dialog immediately in this component
          if (data?.resumeAt !== 'payment') {
            clearPendingBookingContext();
          }
        }
      }
    } catch {}
  }, [venue.id]);
  
  // Get discount information
  const discountInfo = getVenueDiscountInfo(services || []);

  // Measure how many chips fit
  useLayoutEffect(() => {
    const container = chipsContainerRef.current;
    const measureNode = chipsMeasureRef.current;
    if (!container || !measureNode) return;

    const measure = () => {
      const chipElements = Array.from(measureNode.querySelectorAll('[data-chip="true"]')) as HTMLElement[];
      if (chipElements.length === 0) {
        setVisibleChipCount(null);
        return;
      }
      const style = getComputedStyle(container);
      const gapParsed = parseFloat(style.gap || style.columnGap || '8');
      const gap = Number.isFinite(gapParsed) ? gapParsed : 8;
      const containerWidth = container.clientWidth;
      const widths = chipElements.map(el => el.offsetWidth);
      let best = widths.length;
      for (let k = widths.length; k >= 0; k--) {
        const sum = widths.slice(0, k).reduce((a, b) => a + b, 0);
        const gaps = k > 0 ? gap * (k - 1) : 0;
        const needsPlus = k < widths.length;
        const reserve = needsPlus ? 28 : 0; // approximate +N width
        if (sum + gaps + reserve <= containerWidth) { best = k; break; }
      }
      setVisibleChipCount(best);
    };

    const raf = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [venue.id, searchMode, compact, chipLabels.join('|')]);
  
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
  
  // Get venue images
  const venueImages = venue.images && venue.images.length > 0 
    ? venue.images 
    : ["https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800"];
  
  // Reset image index when venue changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsTransitioning(false);
  }, [venue.id]);
  
  // Debounced image change to prevent rapid transitions
  const changeImageIndex = useCallback((newIndex: number) => {
    if (isTransitioning || newIndex === currentImageIndex) return;
    
    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);
    
    // Reset transition state after animation completes
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentImageIndex, isTransitioning]);
  
  const handlePrevious = useCallback(() => {
    const newIndex = currentImageIndex === 0 ? venueImages.length - 1 : currentImageIndex - 1;
    changeImageIndex(newIndex);
  }, [currentImageIndex, venueImages.length, changeImageIndex]);
  
  const handleNext = useCallback(() => {
    const newIndex = currentImageIndex === venueImages.length - 1 ? 0 : currentImageIndex + 1;
    changeImageIndex(newIndex);
  }, [currentImageIndex, venueImages.length, changeImageIndex]);

  // Enhanced touch-swipe support for mobile image carousel
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const didSwipeRef = useRef<boolean>(false);
  const isTrackingTouchRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);

  const SWIPE_THRESHOLD = 20; // pixels - very low threshold for easy mobile swiping
  const SWIPE_TIME_THRESHOLD = 1000; // milliseconds - very forgiving timing

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length !== 1 || isTransitioning) return;
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    touchStartTimeRef.current = Date.now();
    isTrackingTouchRef.current = true;
    didSwipeRef.current = false;
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isTrackingTouchRef.current || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartXRef.current;
    const dy = t.clientY - touchStartYRef.current;
    
    // Don't call preventDefault in passive event listeners
    // The browser will handle scrolling appropriately
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isTrackingTouchRef.current || isTransitioning) return;
    isTrackingTouchRef.current = false;
    
    const changed = e.changedTouches && e.changedTouches[0];
    if (!changed || touchStartXRef.current === null) return;
    
    const dx = changed.clientX - touchStartXRef.current;
    const dy = changed.clientY - (touchStartYRef.current || 0);
    const timeDiff = Date.now() - touchStartTimeRef.current;
    
    // Check if it's a valid horizontal swipe
    // Very mobile-friendly criteria
    const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) * 1.2; // More lenient horizontal detection
    const isValidDistance = Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) < 400; // Increased max distance
    const isValidTime = timeDiff < SWIPE_TIME_THRESHOLD;
    
    if (isValidDistance && isHorizontalSwipe && isValidTime) {
      didSwipeRef.current = true;
      if (dx < 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    } else {
      // Debug logging to understand why swipes aren't working
      console.log('Swipe not detected:', {
        dx: Math.abs(dx),
        dy: Math.abs(dy),
        isValidDistance,
        isHorizontalSwipe,
        isValidTime,
        timeDiff,
        threshold: SWIPE_THRESHOLD
      });
    }
    
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
      className="group w-full"
      onMouseEnter={() => onHover?.(venue)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      <Link 
        to={`/venue/${venue.id}`}
        className="block h-full"
        onClickCapture={(e) => {
          // If a swipe just occurred, block navigation
          if (didSwipeRef.current) {
            e.preventDefault();
            e.stopPropagation();
            // reset so subsequent taps work
            didSwipeRef.current = false;
          }
        }}
      >
        <Card className={`overflow-hidden bg-card dark:bg-[hsl(var(--dark-surface-2))] border-0 shadow-md hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/50 transition-all duration-300 cursor-pointer w-full h-full rounded-xl flex flex-col justify-between ${
          !isVenueBookableNow(venue.working_hours) ? 'opacity-60 grayscale' : ''
        }`}>
          {/* Image Section */}
          <div className="relative">
            <div 
              className={`relative overflow-hidden ${searchMode ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'pan-y pinch-zoom' }}
            >
              <img
                src={venueImages[currentImageIndex]}
                alt={`${venue.name} - Image ${currentImageIndex + 1}`}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                  isTransitioning ? 'opacity-90' : 'opacity-100'
                }`}
                style={{
                  transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
                }}
              />
              
              {/* Star Rating Badge - Top Left */}
              <div className="absolute top-3 left-3">
                <div className={`bg-primary text-white rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm dark:bg-primary dark:shadow-primary/20 ${
                  searchMode ? 'px-2 py-1' : 'px-3 py-1.5'
                }`}>
                  <Star className={`${searchMode ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} fill-current`} />
                  <span className={`font-semibold ${
                    searchMode ? 'text-xs' : 'text-sm'
                  }`}>{venue.rating}</span>
                </div>
              </div>
              
              {/* Discount Badge - Top Right (if has discount) */}
              {discountInfo.hasDiscount && (
                <div className="absolute top-3 right-3">
                  <div className={`bg-green-600 text-white rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-pulse dark:bg-green-500 dark:shadow-green-500/20 ${
                    searchMode ? 'px-2 py-1' : 'px-3 py-1.5'
                  }`}>
                    {React.createElement(getDiscountIcon(discountInfo.bestDiscount?.type || 'overall'), { 
                      className: searchMode ? "h-2.5 w-2.5" : "h-3.5 w-3.5" 
                    })}
                    <span className={`font-semibold ${
                      searchMode ? 'text-xs' : 'text-sm'
                    }`}>
                      {discountInfo.bestDiscount?.label}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Venue-level Discount Badge - Top Right */}
              <div className="absolute top-3 right-0">
                <VenueDiscountIndicator 
                  venueDiscounts={venue} 
                  className={searchMode ? "text-xs" : "text-sm"}
                />
              </div>
              
              
              {/* Carousel Navigation */}
              {venueImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevious();
                    }}
                    disabled={isTransitioning}
                    className={`absolute top-1/2 -translate-y-1/2 left-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 ${searchMode ? 'w-4 h-4' : 'w-6 h-6'} ${
                      isTransitioning ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                    style={{ minWidth: searchMode ? '16px' : '24px', minHeight: searchMode ? '16px' : '24px' }}
                  >
                    <ArrowLeft className={`${searchMode ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNext();
                    }}
                    disabled={isTransitioning}
                    className={`absolute top-1/2 -translate-y-1/2 right-2 bg-primary hover:bg-primary/90 text-white rounded-full backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center dark:bg-primary dark:hover:bg-primary/80 ${searchMode ? 'w-4 h-4' : 'w-6 h-6'} ${
                      isTransitioning ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                    style={{ minWidth: searchMode ? '16px' : '24px', minHeight: searchMode ? '16px' : '24px' }}
                  >
                    <ArrowRight className={`${searchMode ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {venueImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                  {venueImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        changeImageIndex(index);
                      }}
                      disabled={isTransitioning}
                      className={`rounded-full transition-all duration-200 ${
                        index === currentImageIndex
                          ? 'bg-white w-2 h-2 shadow-lg'
                          : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'
                      } ${isTransitioning ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    />
                  ))}
                </div>
              )}
              
              {/* Price Overlay - Bottom Right */}
              <div className="absolute bottom-2 right-2">
                <div className={`bg-background/90 dark:bg-[hsl(var(--dark-surface-3))]/90 backdrop-blur-sm rounded-md shadow-md dark:shadow-black/20 ${
                  searchMode ? 'px-1.5 py-1' : 'px-2 py-1.5'
                }`}>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`font-semibold text-primary ${
                      searchMode ? 'text-xs' : 'text-sm'
                    }`}>
                      {services && services.length > 0 
                        ? (() => {
                            const prices = services.map(service => {
                              const displayPrice = getServicePricingSummary(service, t, i18n.language as 'en' | 'ka', t('booking.currency'), t('common.hourShort'));
                              return extractNumericPrice(displayPrice) || service.price;
                            });
                            return `${Math.min(...prices)} ${t('booking.currency')}`;
                          })()
                        : `${venue.price} ${t('booking.currency')}`}
                    </span>
                    <span className={`text-muted-foreground ${
                      searchMode ? 'text-[10px]' : 'text-xs'
                    }`}>/{t('common.hourShort')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Section */}
          <CardContent className={`${searchMode ? 'p-2' : 'p-3'} flex-1 flex flex-col`}>
            {/* Venue Name and Opening Hours - Horizontal */}
            <div className="flex items-center justify-between mb-1.5">
              <h3 className={`font-bold text-card-foreground leading-tight group-hover:text-primary transition-colors ${
                searchMode ? 'text-sm' : 'text-base'
              } truncate flex-1 min-w-0 mr-2`}>
                {venue.name}
              </h3>
              <div className="flex items-center text-muted-foreground flex-shrink-0">
                <Clock className={`${searchMode ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5'} text-muted-foreground flex-shrink-0 dark:text-[hsl(var(--text-secondary))]`} />
                <span className={`${searchMode ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground whitespace-nowrap dark:text-[hsl(var(--text-secondary))]`}>
                  {(() => {
                    const todaySchedule = getTodaySchedule(venue.working_hours);
                    if (!todaySchedule) return "24/7";
                    if (todaySchedule.closed) return t('common.closedToday');
                    return `${todaySchedule.open} - ${todaySchedule.close}`;
                  })()}
                </span>
              </div>
            </div>
            
            {/* Location Row */}
            <div className="flex items-center text-muted-foreground mb-2">
              <div className="flex items-center flex-1 min-w-0">
                <MapPin className={`${searchMode ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5'} flex-shrink-0 text-muted-foreground dark:text-[hsl(var(--text-secondary))]`} />
                <span className={`${searchMode ? 'text-xs' : 'text-sm'} text-muted-foreground line-clamp-1 truncate dark:text-[hsl(var(--text-secondary))]`}>{venue.location}</span>
              </div>
            </div>
            
            {/* Service Tags and Book Now Button Row */}
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2" ref={chipsContainerRef}>
                {(visibleChipCount === null ? chipLabels : chipLabels.slice(0, visibleChipCount)).map((label, idx) => (
                  <div 
                    key={idx} 
                    data-chip="true"
                    className={`${searchMode ? 'text-[9px] px-2 py-1' : 'text-[10px] px-2.5 py-1.5'} bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-md font-medium flex-shrink-0 whitespace-nowrap inline-flex items-center`}
                    style={{ lineHeight: '1.2' }}
                  >
                    {label}
                  </div>
                ))}
                {visibleChipCount !== null && chipLabels.length > visibleChipCount && (
                  <div className={`${searchMode ? 'text-[9px] px-1.5 py-1' : 'text-[10px] px-2 py-1.5'} bg-muted dark:bg-[hsl(var(--dark-surface-3))] text-muted-foreground dark:text-[hsl(var(--text-secondary))] rounded-md flex-shrink-0 inline-flex items-center`}>
                    +{chipLabels.length - visibleChipCount}
                  </div>
                )}
                {/* Hidden measuring container */}
                <div className="absolute invisible pointer-events-none -z-10 top-0 left-0 flex gap-1.5" ref={chipsMeasureRef}>
                  {chipLabels.map((label, idx) => (
                    <div 
                      key={`measure-${idx}`} 
                      data-chip="true"
                      className={`${searchMode ? 'text-[9px] px-2 py-1' : 'text-[10px] px-2.5 py-1.5'} bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-md font-medium whitespace-nowrap inline-flex items-center`}
                      style={{ lineHeight: '1.2' }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Book Now Button */}
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDialog(venue, services || []);
                }}
                size="sm"
                className={`${
                  searchMode ? 'text-[10px] px-2 py-1 h-auto' : 'text-xs px-3 py-1.5 h-auto'
                } bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md flex-shrink-0 whitespace-nowrap transition-colors`}
              >
                {t('common.bookNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
      
    </motion.div>
  );
};

export default VenueCard;