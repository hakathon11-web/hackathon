/**
 * Google Analytics 4 Integration
 * Privacy-compliant analytics tracking with consent management
 */

// Google Analytics 4 Types
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface AnalyticsConfig {
  trackingId: string;
  debug?: boolean;
  anonymizeIp?: boolean;
  respectDnt?: boolean;
  sendPageView?: boolean;
  enhancedEcommerce?: boolean;
}

class GoogleAnalytics {
  private config: AnalyticsConfig;
  private isInitialized = false;
  private consentGiven = false;

  constructor(config: AnalyticsConfig) {
    this.config = {
      anonymizeIp: true,
      respectDnt: true,
      sendPageView: true,
      enhancedEcommerce: false,
      ...config,
    };
  }

  /**
   * Initialize Google Analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Skip analytics on localhost/development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Analytics: Skipping initialization on localhost - GA4 only works on public domains');
      return;
    }

    // Check if user has given consent for analytics
    const consent = await this.checkAnalyticsConsent();
    if (!consent) {
      console.log('Analytics: User has not given consent for analytics tracking');
      // TEMPORARY: Uncomment the line below to force analytics on production for testing
      // console.log('Analytics: Forcing initialization for testing (remove this in production)');
      return;
    }

    // Check Do Not Track preference
    if (this.config.respectDnt && this.isDntEnabled()) {
      console.log('Analytics: Do Not Track is enabled, skipping analytics');
      return;
    }

    try {
      await this.loadGoogleAnalyticsScript();
      this.setupGtag();
      this.consentGiven = true;
      this.isInitialized = true;
      
      if (this.config.debug) {
        console.log('Analytics: Successfully initialized Google Analytics 4');
      }
    } catch (error) {
      console.error('Analytics: Failed to initialize Google Analytics', error);
    }
  }

  /**
   * Load Google Analytics script
   */
  private async loadGoogleAnalyticsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector('script[src*="googletagmanager.com"]')) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.trackingId}`;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Analytics script'));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Setup gtag configuration
   */
  private setupGtag(): void {
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // Set initial timestamp
    window.gtag('js', new Date());

    // Configure Google Analytics
    window.gtag('config', this.config.trackingId, {
      // Privacy settings
      anonymize_ip: this.config.anonymizeIp,
      allow_google_signals: false, // Disable Google Signals for enhanced privacy
      allow_ad_personalization_signals: false,
      
      // Performance settings
      send_page_view: this.config.sendPageView,
      transport_type: 'beacon',
      
      // Custom settings
      custom_map: {
        custom_parameter_1: 'user_type',
        custom_parameter_2: 'booking_status',
      },

      // Enhanced measurement (optional)
      enhanced_measurement: this.config.enhancedEcommerce,
    });
  }

  /**
   * Track custom events
   */
  trackEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized || !this.consentGiven) {
      if (this.config.debug) {
        console.log('Analytics: Event not tracked - analytics not initialized or consent not given');
      }
      return;
    }

    const eventParams: Record<string, any> = {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.custom_parameters,
    };

    // Remove undefined values
    Object.keys(eventParams).forEach(key => {
      if (eventParams[key] === undefined) {
        delete eventParams[key];
      }
    });

    window.gtag('event', event.action, eventParams);

    if (this.config.debug) {
      console.log('Analytics: Event tracked', { action: event.action, ...eventParams });
    }
  }

  /**
   * Track page views
   */
  trackPageView(pagePath?: string, pageTitle?: string): void {
    if (!this.isInitialized || !this.consentGiven) return;

    const pageParams: Record<string, any> = {};
    if (pagePath) pageParams.page_path = pagePath;
    if (pageTitle) pageParams.page_title = pageTitle;

    window.gtag('event', 'page_view', pageParams);

    if (this.config.debug) {
      console.log('Analytics: Page view tracked', pageParams);
    }
  }

  /**
   * Track user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized || !this.consentGiven) return;

    window.gtag('config', this.config.trackingId, {
      user_properties: properties,
    });

    if (this.config.debug) {
      console.log('Analytics: User properties set', properties);
    }
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionId: string, value?: number, currency?: string): void {
    if (!this.isInitialized || !this.consentGiven) return;

    const conversionParams: Record<string, any> = {
      send_to: conversionId,
    };

    if (value !== undefined) conversionParams.value = value;
    if (currency) conversionParams.currency = currency;

    window.gtag('event', 'conversion', conversionParams);

    if (this.config.debug) {
      console.log('Analytics: Conversion tracked', conversionParams);
    }
  }

  /**
   * Check analytics consent
   */
  private async checkAnalyticsConsent(): Promise<boolean> {
    // Import consent module dynamically to avoid circular dependencies
    const { consent } = await import('./consent');
    return consent.has('analytics');
  }

  /**
   * Check if Do Not Track is enabled
   */
  private isDntEnabled(): boolean {
    return (
      navigator.doNotTrack === '1' ||
      navigator.doNotTrack === 'yes' ||
      // @ts-ignore - some browsers use msDoNotTrack
      navigator.msDoNotTrack === '1'
    );
  }

  /**
   * Update consent status
   */
  async updateConsent(): Promise<void> {
    const consent = await this.checkAnalyticsConsent();
    
    if (consent && !this.consentGiven) {
      // User just gave consent, initialize analytics
      await this.initialize();
    } else if (!consent && this.consentGiven) {
      // User revoked consent, we should stop tracking
      // Note: GA4 doesn't provide a direct way to stop tracking,
      // but we can stop sending events
      this.consentGiven = false;
      
      if (this.config.debug) {
        console.log('Analytics: Consent revoked, stopping event tracking');
      }
    }
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): boolean {
    return this.consentGiven;
  }

  /**
   * Check if analytics is initialized
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

// Create singleton instance
let analyticsInstance: GoogleAnalytics | null = null;

/**
 * Initialize Google Analytics with the provided configuration
 */
export const initializeAnalytics = async (config: AnalyticsConfig): Promise<GoogleAnalytics> => {
  if (!analyticsInstance) {
    analyticsInstance = new GoogleAnalytics(config);
    await analyticsInstance.initialize();
  }
  return analyticsInstance;
};

/**
 * Get the analytics instance
 */
export const getAnalytics = (): GoogleAnalytics | null => {
  return analyticsInstance;
};

/**
 * Track a custom event
 */
export const trackEvent = (event: AnalyticsEvent): void => {
  analyticsInstance?.trackEvent(event);
};

/**
 * Track a page view
 */
export const trackPageView = (pagePath?: string, pageTitle?: string): void => {
  analyticsInstance?.trackPageView(pagePath, pageTitle);
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  analyticsInstance?.setUserProperties(properties);
};

/**
 * Track conversion
 */
export const trackConversion = (conversionId: string, value?: number, currency?: string): void => {
  analyticsInstance?.trackConversion(conversionId, value, currency);
};

/**
 * Update consent status
 */
export const updateAnalyticsConsent = async (): Promise<void> => {
  await analyticsInstance?.updateConsent();
};

// Common event tracking functions for the application
export const analyticsEvents = {
  // User engagement
  search: (query: string, resultsCount?: number) => trackEvent({
    action: 'search',
    category: 'engagement',
    label: query,
    value: resultsCount,
    custom_parameters: { search_term: query }
  }),

  // Booking events
  bookingStarted: (venueId: string, serviceType: string) => trackEvent({
    action: 'begin_checkout',
    category: 'ecommerce',
    label: `${venueId}_${serviceType}`,
    custom_parameters: { venue_id: venueId, service_type: serviceType }
  }),

  bookingCompleted: (bookingId: string, value: number, currency: string = 'GEL') => trackEvent({
    action: 'purchase',
    category: 'ecommerce',
    label: bookingId,
    value: value,
    custom_parameters: { booking_id: bookingId, currency }
  }),

  bookingCancelled: (bookingId: string, reason?: string) => trackEvent({
    action: 'booking_cancelled',
    category: 'ecommerce',
    label: bookingId,
    custom_parameters: { booking_id: bookingId, cancellation_reason: reason }
  }),

  // Venue interactions
  venueViewed: (venueId: string, venueName: string) => trackEvent({
    action: 'view_item',
    category: 'engagement',
    label: venueId,
    custom_parameters: { venue_id: venueId, venue_name: venueName }
  }),

  venueFavorited: (venueId: string) => trackEvent({
    action: 'venue_favorited',
    category: 'engagement',
    label: venueId,
    custom_parameters: { venue_id: venueId }
  }),

  // Authentication
  userSignedUp: (method: string = 'email') => trackEvent({
    action: 'sign_up',
    category: 'engagement',
    label: method,
    custom_parameters: { signup_method: method }
  }),

  userSignedIn: (method: string = 'email') => trackEvent({
    action: 'login',
    category: 'engagement',
    label: method,
    custom_parameters: { login_method: method }
  }),

  // Navigation
  navigationClick: (destination: string) => trackEvent({
    action: 'navigation_click',
    category: 'navigation',
    label: destination
  }),

  // Error tracking
  error: (errorType: string, errorMessage: string) => trackEvent({
    action: 'exception',
    category: 'error',
    label: errorType,
    custom_parameters: { error_message: errorMessage }
  }),
};

export default GoogleAnalytics;
