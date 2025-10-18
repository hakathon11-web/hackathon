// Global Google Maps loader utility

import { getSupabaseConfig } from '@/config/supabase';

// Helper function to get Supabase URL from centralized config
function getSupabaseUrl(): string {
  const config = getSupabaseConfig();
  
  // Security improvement: Validate URL format
  if (!config.url || !config.url.startsWith('https://')) {
    throw new Error('Supabase URL not properly configured');
  }
  
  return config.url;
}
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadingPromise: Promise<void> | null = null;
  private isLoaded = false;
  private apiKey: string | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!(window.google && window.google.maps);
  }

  async loadGoogleMaps(apiKey?: string): Promise<boolean> {
    // If already loaded, return true
    if (this.isGoogleMapsLoaded()) {
      return true;
    }

    // If already loading, wait for the existing promise
    if (this.loadingPromise) {
      try {
        await this.loadingPromise;
        return this.isGoogleMapsLoaded();
      } catch (error) {
        return false;
      }
    }

    // Get API key from parameter or fetch from Supabase
    let key = apiKey;
    
    if (!key) {
      try {
        // Fetching Google Maps API key from Supabase
        
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-google-maps-api-key`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        key = data.apiKey;
        // Successfully fetched Google Maps API key from Supabase
      } catch (error) {
        return false;
      }
    }
    
    if (!key || key === 'your-google-maps-api-key-here') {
      return false;
    }

    this.apiKey = key;

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      this.loadingPromise = this.waitForExistingScript();
    } else {
      this.loadingPromise = this.loadScript();
    }

    try {
      await this.loadingPromise;
      this.isLoaded = true;
      this.loadingPromise = null;
      return true;
    } catch (error) {
      this.loadingPromise = null;
      return false;
    }
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  private waitForExistingScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };

      // Set a timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for Google Maps to load'));
      }, 10000);

      checkGoogleMaps();

      // Clear timeout when resolved
      const originalResolve = resolve;
      resolve = () => {
        clearTimeout(timeout);
        originalResolve();
      };
    });
  }
}

// Export singleton instance
export const googleMapsLoader = GoogleMapsLoader.getInstance();