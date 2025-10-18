import { useState, useCallback } from 'react';
import { clearPendingBookingContext } from '@/lib/pendingBooking';

interface GlobalBookingDialogState {
  isOpen: boolean;
  venue: any | null;
  services: any[] | null;
}

let globalState: GlobalBookingDialogState = {
  isOpen: false,
  venue: null,
  services: null
};

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const useGlobalBookingDialog = () => {
  const [state, setState] = useState(globalState);

  const updateState = useCallback((newState: Partial<GlobalBookingDialogState>) => {
    globalState = { ...globalState, ...newState };
    notifyListeners();
  }, []);

  // Subscribe to global state changes
  useState(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => listeners.delete(listener);
  });

  const openDialog = useCallback((venue: any, services: any[] = []) => {
    console.log('GlobalBookingDialog - Opening dialog for venue:', venue.name);
    updateState({
      isOpen: true,
      venue,
      services
    });
  }, [updateState]);

  const closeDialog = useCallback(() => {
    console.log('GlobalBookingDialog - Closing dialog');
    updateState({
      isOpen: false,
      venue: null,
      services: null
    });
    // Clear any pending booking context when the user exits the flow
    try { clearPendingBookingContext(); } catch {}
  }, [updateState]);

  return {
    ...state,
    openDialog,
    closeDialog
  };
};
