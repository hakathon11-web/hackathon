import { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interfaces for widget state structure
export interface BookingWidgetState {
  isExpanded: boolean;
  categories: {
    activeBookings: boolean;
    pendingApprovals: boolean;
    pendingReviews: boolean;
    rejectedBookings: boolean;
    cancelledBookings: boolean;
    expiredBookings: boolean;
  };
  widgetPosition?: {
    x: number;
    y: number;
  };
  lastUpdated: string;
}

export interface UsePersistentWidgetStateOptions {
  storageKey?: string;
  defaultState?: Partial<BookingWidgetState>;
  syncAcrossTabs?: boolean;
  debounceMs?: number;
}

// Default state configuration
const DEFAULT_WIDGET_STATE: BookingWidgetState = {
  isExpanded: true,
  categories: {
    activeBookings: true,
    pendingApprovals: true,
    pendingReviews: false,
    rejectedBookings: false,
    cancelledBookings: false,
    expiredBookings: false,
  },
  widgetPosition: undefined,
  lastUpdated: new Date().toISOString(),
};

// Storage helper functions with error handling
const storage = {
  get: (key: string): BookingWidgetState | null => {
    if (typeof window === 'undefined') return null;

    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        console.log(`[PersistentWidget] No stored state found for key: ${key}`);
        return null;
      }

      const parsed = JSON.parse(item);
      console.log(`[PersistentWidget] Loaded state from localStorage:`, parsed);

      // Validate the structure
      if (typeof parsed === 'object' && parsed !== null && 'categories' in parsed) {
        return parsed as BookingWidgetState;
      }
      return null;
    } catch (error) {
      console.warn(`[PersistentWidget] Failed to parse localStorage item for key "${key}":`, error);
      return null;
    }
  },

  set: (key: string, value: BookingWidgetState): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      console.log(`[PersistentWidget] Saved state to localStorage:`, value);
      return true;
    } catch (error) {
      console.warn(`[PersistentWidget] Failed to save to localStorage for key "${key}":`, error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      window.localStorage.removeItem(key);
      console.log(`[PersistentWidget] Removed state from localStorage for key: ${key}`);
      return true;
    } catch (error) {
      console.warn(`[PersistentWidget] Failed to remove from localStorage for key "${key}":`, error);
      return false;
    }
  },

  isAvailable: (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Custom hook for managing persistent widget state with localStorage
 *
 * Features:
 * - Automatic persistence to localStorage
 * - Cross-tab synchronization
 * - Debounced saves for performance
 * - Comprehensive error handling
 * - TypeScript support
 * - SSR-safe implementation
 */
export function usePersistentWidgetState(options: UsePersistentWidgetStateOptions = {}) {
  const {
    storageKey = 'booking-widget-state',
    defaultState = {},
    syncAcrossTabs = true,
    debounceMs = 500,
  } = options;

  // Merge default state with provided defaults
  const initialState: BookingWidgetState = {
    ...DEFAULT_WIDGET_STATE,
    ...defaultState,
    categories: {
      ...DEFAULT_WIDGET_STATE.categories,
      ...(defaultState.categories || {}),
    },
  };

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<string>('');
  const hasInitialized = useRef(false);
  const previousStateRef = useRef<string>('');
  const justSavedImmediatelyRef = useRef(false);

  // Initialize state from localStorage or use defaults
  const [state, setState] = useState<BookingWidgetState>(() => {
    // Always check localStorage on mount (including page refresh)
    if (typeof window !== 'undefined' && storage.isAvailable()) {
      const stored = storage.get(storageKey);
      if (stored) {
        console.log(`[PersistentWidget] Initializing with stored state`);
        // Merge stored state with defaults to handle new properties
        const mergedState = {
          ...initialState,
          ...stored,
          categories: {
            ...initialState.categories,
            ...(stored.categories || {}),
          },
        };
        // Initialize the last saved state reference (without timestamp)
        const stateForComparison = {
          isExpanded: mergedState.isExpanded,
          categories: mergedState.categories,
          widgetPosition: mergedState.widgetPosition
        };
        const stateString = JSON.stringify(stateForComparison);
        lastSavedStateRef.current = stateString;
        previousStateRef.current = stateString;
        return mergedState;
      }
    }

    console.log(`[PersistentWidget] Initializing with default state`);
    // Initialize the last saved state reference with default state (without timestamp)
    const stateForComparison = {
      isExpanded: initialState.isExpanded,
      categories: initialState.categories,
      widgetPosition: initialState.widgetPosition
    };
    const stateString = JSON.stringify(stateForComparison);
    lastSavedStateRef.current = stateString;
    previousStateRef.current = stateString;
    return initialState;
  });

  // Save state to localStorage immediately (no debounce)
  const saveStateImmediate = useCallback((newState: BookingWidgetState) => {
    // Create state for comparison (without timestamp)
    const stateForComparison = {
      isExpanded: newState.isExpanded,
      categories: newState.categories,
      widgetPosition: newState.widgetPosition
    };
    const comparisonString = JSON.stringify(stateForComparison);

    // Check if the actual state content changed (ignoring timestamp)
    if (comparisonString === lastSavedStateRef.current) {
      console.log(`[PersistentWidget] State unchanged, skipping save`);
      return; // Skip save if no changes
    }

    const stateToSave = {
      ...newState,
      lastUpdated: new Date().toISOString(),
    };

    if (storage.set(storageKey, stateToSave)) {
      lastSavedStateRef.current = comparisonString; // Store comparison string, not full state
      previousStateRef.current = comparisonString; // Update previous state to prevent double-saving
      justSavedImmediatelyRef.current = true; // Mark that we just saved immediately

      // Dispatch custom event for cross-tab sync
      if (syncAcrossTabs && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('widget-state-changed', {
          detail: { key: storageKey, state: stateToSave }
        }));
      }
    }
  }, [storageKey, syncAcrossTabs]);

  // Save state to localStorage with debouncing
  const saveState = useCallback((newState: BookingWidgetState) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      saveStateImmediate(newState);
    }, debounceMs);
  }, [saveStateImmediate, debounceMs]);

  // Update main expanded state
  const setIsExpanded = useCallback((isExpanded: boolean | ((prev: boolean) => boolean)) => {
    setState(prevState => {
      const newExpanded = typeof isExpanded === 'function' ? isExpanded(prevState.isExpanded) : isExpanded;
      const newState = { ...prevState, isExpanded: newExpanded };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Update category expanded states
  const setCategoryExpanded = useCallback((category: keyof BookingWidgetState['categories'], expanded: boolean) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        categories: {
          ...prevState.categories,
          [category]: expanded,
        },
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Batch update multiple categories
  const setCategoriesExpanded = useCallback((updates: Partial<BookingWidgetState['categories']>) => {
    setState(prevState => {
      const newState = {
        ...prevState,
        categories: {
          ...prevState.categories,
          ...updates,
        },
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Update widget position - use immediate save for responsiveness
  const setWidgetPosition = useCallback((position: { x: number; y: number } | undefined) => {
    setState(prevState => {
      const newState = { ...prevState, widgetPosition: position };
      // Save position immediately for better UX
      saveStateImmediate(newState);
      return newState;
    });
  }, [saveStateImmediate]);

  // Reset to default state
  const resetState = useCallback(() => {
    setState(initialState);
    storage.remove(storageKey);

    if (syncAcrossTabs) {
      window.dispatchEvent(new CustomEvent('widget-state-reset', {
        detail: { key: storageKey }
      }));
    }
  }, [storageKey, syncAcrossTabs, initialState]);

  // Save initial state if it's the first mount and nothing was in localStorage
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      // Check if we need to save the initial state
      const stored = storage.get(storageKey);
      if (!stored && storage.isAvailable()) {
        console.log(`[PersistentWidget] Saving initial state to localStorage`);
        saveStateImmediate(state);
      }
    }
  }, []); // Only run once on mount

  // Save state whenever it changes (with debouncing)
  useEffect(() => {
    // Skip the first render to avoid double-saving
    if (hasInitialized.current) {
      // If we just saved immediately, skip this effect to avoid double-saving
      if (justSavedImmediatelyRef.current) {
        justSavedImmediatelyRef.current = false; // Reset the flag
        console.log(`[PersistentWidget] Skipping debounced save - just saved immediately`);
        return;
      }

      // Create comparison object (without timestamp)
      const currentStateForComparison = {
        isExpanded: state.isExpanded,
        categories: state.categories,
        widgetPosition: state.widgetPosition
      };
      const currentStateString = JSON.stringify(currentStateForComparison);
      
      // Only save if state actually changed
      if (currentStateString !== previousStateRef.current) {
        console.log(`[PersistentWidget] State actually changed, triggering debounced save:`, currentStateForComparison);
        console.log(`[PersistentWidget] Previous state:`, previousStateRef.current);
        console.log(`[PersistentWidget] Current state:`, currentStateString);
        previousStateRef.current = currentStateString;
        saveState(state);
      } else {
        console.log(`[PersistentWidget] State unchanged, skipping debounced save - same content`);
      }
    }
  }, [state]); // Removed saveState from dependencies to prevent infinite loop

  // Listen for cross-tab changes
  useEffect(() => {
    if (!syncAcrossTabs || !storage.isAvailable()) {
      return;
    }

    // Handle storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue) as BookingWidgetState;
          setState(newState);
          lastSavedStateRef.current = e.newValue;
        } catch (error) {
          console.warn('Failed to parse storage event:', error);
        }
      }
    };

    // Handle custom events (same tab)
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; state: BookingWidgetState }>;
      if (customEvent.detail.key === storageKey) {
        setState(customEvent.detail.state);
        lastSavedStateRef.current = JSON.stringify(customEvent.detail.state);
      }
    };

    const handleResetEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      if (customEvent.detail.key === storageKey) {
        setState(initialState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('widget-state-changed', handleCustomEvent);
    window.addEventListener('widget-state-reset', handleResetEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('widget-state-changed', handleCustomEvent);
      window.removeEventListener('widget-state-reset', handleResetEvent);
    };
  }, [storageKey, syncAcrossTabs, initialState]);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isExpanded: state.isExpanded,
    categories: state.categories,
    widgetPosition: state.widgetPosition,

    // Individual setters
    setIsExpanded,
    setCategoryExpanded,
    setCategoriesExpanded,
    setWidgetPosition,

    // Utility functions
    resetState,

    // Helper getters
    isCategoryExpanded: (category: keyof BookingWidgetState['categories']) => state.categories[category],

    // Full state access
    state,
    setState: (newState: Partial<BookingWidgetState>) => {
      setState(prev => {
        const updated = { ...prev, ...newState };
        saveState(updated);
        return updated;
      });
    },
  };
}

// Export a singleton instance for global usage
let globalInstance: ReturnType<typeof usePersistentWidgetState> | null = null;

export function getGlobalWidgetState() {
  if (!globalInstance) {
    // This will be initialized on first use
    console.warn('Global widget state not initialized. Use usePersistentWidgetState hook first.');
  }
  return globalInstance;
}

export function setGlobalWidgetState(instance: ReturnType<typeof usePersistentWidgetState>) {
  globalInstance = instance;
}