/**
 * React hook for Google Analytics integration
 * Provides easy access to analytics functions with automatic consent checking
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  initializeAnalytics, 
  getAnalytics, 
  trackEvent, 
  trackPageView, 
  setUserProperties,
  updateAnalyticsConsent,
  analyticsEvents,
  type AnalyticsEvent 
} from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import consent from '@/lib/consent';

export interface UseAnalyticsOptions {
  trackingId: string;
  debug?: boolean;
  trackPageViews?: boolean;
  trackUserProperties?: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions) => {
  const location = useLocation();
  const { user } = useAuth();
  const initializedRef = useRef(false);
  const lastPageRef = useRef<string>('');

  // Initialize analytics on mount
  useEffect(() => {
    const initAnalytics = async () => {
      if (initializedRef.current || !options.trackingId) return;

      try {
        await initializeAnalytics({
          trackingId: options.trackingId,
          debug: options.debug || false,
        });
        initializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };

    initAnalytics();
  }, [options.trackingId, options.debug]);

  // Track page views on route changes
  useEffect(() => {
    if (!initializedRef.current || !options.trackPageViews) return;

    const currentPage = location.pathname + location.search;
    
    // Avoid tracking the same page multiple times
    if (currentPage === lastPageRef.current) return;
    
    lastPageRef.current = currentPage;

    // Small delay to ensure page has loaded
    const timer = setTimeout(() => {
      trackPageView(currentPage, document.title);
    }, 100);

    return () => clearTimeout(timer);
  }, [location, options.trackPageViews]);

  // Update user properties when user changes
  useEffect(() => {
    if (!initializedRef.current || !options.trackUserProperties || !user) return;

    const userProperties: Record<string, any> = {
      user_id: user.id,
      user_type: user.role || 'guest',
      created_at: user.created_at,
    };

    // Add additional user properties if available
    if (user.email) userProperties.email_domain = user.email.split('@')[1];
    if (user.phone) userProperties.has_phone = true;

    setUserProperties(userProperties);
  }, [user, options.trackUserProperties]);

  // Listen for consent changes
  useEffect(() => {
    const handleConsentChange = () => {
      updateAnalyticsConsent();
    };

    // Check for consent changes periodically (since consent lib doesn't emit events)
    const interval = setInterval(() => {
      const currentConsent = consent.has('analytics');
      const analytics = getAnalytics();
      
      if (analytics && currentConsent !== analytics.getConsentStatus()) {
        handleConsentChange();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Analytics functions
  const track = useCallback((event: AnalyticsEvent) => {
    trackEvent(event);
  }, []);

  const trackPage = useCallback((pagePath?: string, pageTitle?: string) => {
    trackPageView(pagePath, pageTitle);
  }, []);

  const setProperties = useCallback((properties: Record<string, any>) => {
    setUserProperties(properties);
  }, []);

  const updateConsent = useCallback(async () => {
    await updateAnalyticsConsent();
  }, []);

  // Check if analytics is available
  const isAvailable = useCallback(() => {
    const analytics = getAnalytics();
    return analytics?.getInitializationStatus() && analytics?.getConsentStatus();
  }, []);

  return {
    // Core functions
    track,
    trackPage,
    setProperties,
    updateConsent,
    isAvailable,
    
    // Predefined event functions
    events: analyticsEvents,
    
    // Status
    isInitialized: initializedRef.current,
    hasConsent: consent.has('analytics'),
  };
};

// Convenience hook for simple analytics tracking
export const useAnalyticsTracking = (trackingId?: string) => {
  // TEMPORARY FIX: Hardcode tracking ID for Digital Ocean deployment
  const hardcodedTrackingId = 'G-WEP3LE3BJW';
  
  const analytics = useAnalytics({
    trackingId: trackingId || import.meta.env.VITE_GA_TRACKING_ID || hardcodedTrackingId,
    trackPageViews: true,
    trackUserProperties: true,
    debug: import.meta.env.MODE === 'development',
  });

  return analytics;
};

export default useAnalytics;
