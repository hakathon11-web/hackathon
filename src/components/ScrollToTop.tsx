import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that automatically scrolls to the top of the page
 * when the route changes. This prevents the issue where users navigate to
 * a new page but maintain the scroll position from the previous page.
 * 
 * This is particularly important for mobile users who scroll down on the
 * main page and then click on a venue - without this, the venue page
 * would also be scrolled down.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
