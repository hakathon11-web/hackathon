import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
};

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    isLandscape: false,
    isPortrait: false,
    screenWidth: 0,
    screenHeight: 0,
    breakpoint: 'xs',
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine breakpoint
      let breakpoint: ResponsiveState['breakpoint'] = 'xs';
      if (width >= BREAKPOINTS['3xl']) breakpoint = '3xl';
      else if (width >= BREAKPOINTS['2xl']) breakpoint = '2xl';
      else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
      else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
      else if (width >= BREAKPOINTS.md) breakpoint = 'md';
      else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';

      setState({
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg && width < BREAKPOINTS['2xl'],
        isLargeDesktop: width >= BREAKPOINTS['2xl'],
        isLandscape: width > height,
        isPortrait: height > width,
        screenWidth: width,
        screenHeight: height,
        breakpoint,
      });
    };

    // Initial call
    updateResponsiveState();

    // Add event listener
    window.addEventListener('resize', updateResponsiveState);
    window.addEventListener('orientationchange', updateResponsiveState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateResponsiveState);
      window.removeEventListener('orientationchange', updateResponsiveState);
    };
  }, []);

  return state;
};

// Utility functions for responsive design
export const getResponsiveClass = (
  mobile: string,
  tablet?: string,
  desktop?: string,
  largeDesktop?: string
): string => {
  const classes = [mobile];
  if (tablet) classes.push(`md:${tablet}`);
  if (desktop) classes.push(`lg:${desktop}`);
  if (largeDesktop) classes.push(`2xl:${largeDesktop}`);
  return classes.join(' ');
};

export const getResponsiveValue = <T>(
  mobile: T,
  tablet?: T,
  desktop?: T,
  largeDesktop?: T
): T => {
  const { breakpoint } = useResponsive();
  
  if (breakpoint === '3xl' && largeDesktop !== undefined) return largeDesktop;
  if (breakpoint === '2xl' && largeDesktop !== undefined) return largeDesktop;
  if (breakpoint === 'xl' && desktop !== undefined) return desktop;
  if (breakpoint === 'lg' && desktop !== undefined) return desktop;
  if (breakpoint === 'md' && tablet !== undefined) return tablet;
  return mobile;
};

// Responsive spacing utilities
export const responsiveSpacing = {
  xs: 'space-y-2 sm:space-y-3 lg:space-y-4',
  sm: 'space-y-3 sm:space-y-4 lg:space-y-6',
  md: 'space-y-4 sm:space-y-6 lg:space-y-8',
  lg: 'space-y-6 sm:space-y-8 lg:space-y-12',
  xl: 'space-y-8 sm:space-y-12 lg:space-y-16',
};

export const responsivePadding = {
  xs: 'p-2 sm:p-3 lg:p-4',
  sm: 'p-3 sm:p-4 lg:p-6',
  md: 'p-4 sm:p-6 lg:p-8',
  lg: 'p-6 sm:p-8 lg:p-12',
  xl: 'p-8 sm:p-12 lg:p-16',
};

export const responsiveMargin = {
  xs: 'm-2 sm:m-3 lg:m-4',
  sm: 'm-3 sm:m-4 lg:m-6',
  md: 'm-4 sm:m-6 lg:m-8',
  lg: 'm-6 sm:m-8 lg:m-12',
  xl: 'm-8 sm:m-12 lg:m-16',
};

export const responsiveText = {
  xs: 'text-xs sm:text-sm lg:text-base',
  sm: 'text-sm sm:text-base lg:text-lg',
  md: 'text-base sm:text-lg lg:text-xl',
  lg: 'text-lg sm:text-xl lg:text-2xl',
  xl: 'text-xl sm:text-2xl lg:text-3xl',
  '2xl': 'text-2xl sm:text-3xl lg:text-4xl',
  '3xl': 'text-3xl sm:text-4xl lg:text-5xl',
};

export const responsiveGrid = {
  sm: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6',
  md: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8',
  lg: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 lg:gap-10',
  auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8',
};

export const responsiveFlex = {
  col: 'flex flex-col sm:flex-row',
  row: 'flex flex-row sm:flex-col lg:flex-row',
  wrap: 'flex flex-wrap gap-2 sm:gap-3 lg:gap-4',
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  start: 'flex items-center justify-start',
  end: 'flex items-center justify-end',
};

export const responsiveButton = {
  sm: 'px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-xs sm:text-sm lg:text-base',
  md: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-sm sm:text-base lg:text-lg',
  lg: 'px-6 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5 text-base sm:text-lg lg:text-xl',
};

export const responsiveIcon = {
  sm: 'w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5',
  md: 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6',
  lg: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8',
};

export const responsiveImage = {
  sm: 'w-full h-32 sm:h-40 lg:h-48 object-cover',
  md: 'w-full h-40 sm:h-48 lg:h-56 object-cover',
  lg: 'w-full h-48 sm:h-56 lg:h-64 object-cover',
};

export const responsiveCard = {
  sm: 'p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow',
  md: 'p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow',
  lg: 'p-6 sm:p-8 lg:p-12 rounded-lg shadow-sm hover:shadow-md transition-shadow',
};

export const responsiveModal = {
  sm: 'w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto',
  md: 'w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto',
  lg: 'w-full max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto',
};

export const responsiveSidebar = {
  mobile: 'w-full max-w-sm',
  tablet: 'w-full sm:w-64 lg:w-80',
  desktop: 'w-64 lg:w-80',
};

export const responsiveTable = {
  sm: 'w-full text-xs sm:text-sm lg:text-base',
  md: 'w-full text-sm sm:text-base lg:text-lg',
  lg: 'w-full text-base sm:text-lg lg:text-xl',
};

export const responsiveInput = {
  sm: 'px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-xs sm:text-sm lg:text-base',
  md: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-sm sm:text-base lg:text-lg',
  lg: 'px-6 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5 text-base sm:text-lg lg:text-xl',
};

export const responsiveBadge = {
  sm: 'px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 text-xs sm:text-sm lg:text-base',
  md: 'px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-sm sm:text-base lg:text-lg',
  lg: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-base sm:text-lg lg:text-xl',
};

export const responsiveTooltip = {
  sm: 'text-xs sm:text-sm lg:text-base',
  md: 'text-sm sm:text-base lg:text-lg',
  lg: 'text-base sm:text-lg lg:text-xl',
};

export const responsiveSkeleton = {
  text: 'h-4 sm:h-5 lg:h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
  image: 'h-32 sm:h-40 lg:h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
  card: 'h-48 sm:h-56 lg:h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
};

export const responsiveAnimation = {
  transition: 'transition-all duration-200 ease-in-out',
  hover: 'hover:scale-105 hover:shadow-lg transition-transform duration-200 ease-in-out',
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
};

export const responsiveAccessibility = {
  srOnly: 'sr-only',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  highContrast: 'border-2 border-black',
  reducedMotion: 'transition-none',
};

export const responsivePrint = {
  hidden: 'print:hidden',
  visible: 'print:block',
  text: 'print:text-black print:bg-white',
};

export const responsiveOrientation = {
  landscape: 'landscape:py-2',
  portrait: 'portrait:px-2',
};

export const responsiveDarkMode = {
  auto: 'dark:bg-gray-900 dark:text-white',
  manual: 'dark:bg-gray-800 dark:text-gray-100',
};

export const responsiveHighContrast = {
  enabled: 'border-2 border-black',
  disabled: 'border border-gray-300',
};

export const responsiveReducedMotion = {
  enabled: 'transition-none',
  disabled: 'transition-all duration-200 ease-in-out',
};

export default useResponsive;
