import { useEffect, useCallback } from 'react';

/**
 * Hook to ensure layout stability by preventing scrollbar-related layout shifts
 * This is particularly important when dialogs, dropdowns, or other content
 * that might affect the scrollbar visibility are opened/closed
 */
export const useLayoutStability = () => {
  // Function to prevent body style modifications that cause layout shifts
  const preventBodyShifts = useCallback(() => {
    const body = document.body;
    
    // Prevent Radix UI from applying problematic styles
    if (body.style.overflow === 'hidden') {
      body.style.overflow = 'scroll';
    }
    
    if (body.style.paddingRight) {
      body.style.paddingRight = '0px';
    }
    
    if (body.style.position === 'fixed') {
      body.style.position = 'static';
    }
    
    if (body.style.pointerEvents === 'none') {
      body.style.pointerEvents = 'auto';
    }
    
    // Remove scroll-locked attribute if present
    if (body.getAttribute('data-scroll-locked') === '1') {
      body.removeAttribute('data-scroll-locked');
    }
  }, []);

  useEffect(() => {
    // Force scrollbar to always be visible to prevent layout shifts
    const html = document.documentElement;
    html.style.overflowY = 'scroll';

    // Set up a mutation observer to monitor body style changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          preventBodyShifts();
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-scroll-locked') {
          preventBodyShifts();
        }
      });
    });

    // Observe body for style and attribute changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked']
    });

    // Initial check
    preventBodyShifts();

    // Cleanup function
    return () => {
      observer.disconnect();
      // Reset html overflow when component unmounts
      html.style.overflowY = '';
    };
  }, [preventBodyShifts]);

  // Function to handle dialog open/close events
  const handleDialogStateChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // When dialog opens, immediately prevent any body style modifications
      setTimeout(() => {
        preventBodyShifts();
      }, 0);
    } else {
      // When dialog closes, ensure body styles are reset
      setTimeout(() => {
        preventBodyShifts();
      }, 0);
    }
  }, [preventBodyShifts]);

  return { handleDialogStateChange };
};
