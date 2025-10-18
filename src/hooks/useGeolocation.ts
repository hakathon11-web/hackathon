import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationHook extends GeolocationState {
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number; accuracy: number } | null>;
  clearError: () => void;
}

export const useGeolocation = (): GeolocationHook => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getCurrentLocation = useCallback((): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const error = "Your browser doesn't support geolocation.";
        setState(prev => ({ ...prev, error, loading: false }));
        resolve(null);
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      } as const;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setState({
            latitude,
            longitude,
            accuracy,
            error: null,
            loading: false,
          });
          resolve({ latitude, longitude, accuracy });
        },
        (error) => {
          let errorMessage = 'Your location could not be determined.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Your location could not be determined.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Your location could not be determined.';
              break;
          }

          setState(prev => ({
            ...prev,
            error: errorMessage,
            loading: false,
          }));
          resolve(null);
        },
        options
      );
    });
  }, []);

  return {
    ...state,
    getCurrentLocation,
    clearError,
  };
};