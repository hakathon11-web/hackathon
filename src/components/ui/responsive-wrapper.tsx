import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  mobile?: string;
  tablet?: string;
  desktop?: string;
  largeDesktop?: string;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  grid?: 'sm' | 'md' | 'lg' | 'auto';
  flex?: 'col' | 'row' | 'wrap' | 'center' | 'between' | 'start' | 'end';
  button?: 'sm' | 'md' | 'lg';
  icon?: 'sm' | 'md' | 'lg';
  image?: 'sm' | 'md' | 'lg';
  card?: 'sm' | 'md' | 'lg';
  modal?: 'sm' | 'md' | 'lg';
  sidebar?: 'mobile' | 'tablet' | 'desktop';
  table?: 'sm' | 'md' | 'lg';
  input?: 'sm' | 'md' | 'lg';
  badge?: 'sm' | 'md' | 'lg';
  tooltip?: 'sm' | 'md' | 'lg';
  skeleton?: 'text' | 'image' | 'card';
  animation?: 'transition' | 'hover' | 'focus' | 'focusVisible';
  accessibility?: 'srOnly' | 'focusRing' | 'focusVisible' | 'highContrast' | 'reducedMotion';
  print?: 'hidden' | 'visible' | 'text';
  orientation?: 'landscape' | 'portrait';
  darkMode?: 'auto' | 'manual';
  highContrast?: 'enabled' | 'disabled';
  reducedMotion?: 'enabled' | 'disabled';
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  showOnMobile?: boolean;
  showOnTablet?: boolean;
  showOnDesktop?: boolean;
}

export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  className,
  as: Component = 'div',
  mobile,
  tablet,
  desktop,
  largeDesktop,
  spacing,
  padding,
  margin,
  text,
  grid,
  flex,
  button,
  icon,
  image,
  card,
  modal,
  sidebar,
  table,
  input,
  badge,
  tooltip,
  skeleton,
  animation,
  accessibility,
  print,
  orientation,
  darkMode,
  highContrast,
  reducedMotion,
  hideOnMobile,
  hideOnTablet,
  hideOnDesktop,
  showOnMobile,
  showOnTablet,
  showOnDesktop,
  ...props
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Handle visibility based on device type
  if (hideOnMobile && isMobile) return null;
  if (hideOnTablet && isTablet) return null;
  if (hideOnDesktop && isDesktop) return null;
  if (showOnMobile && !isMobile) return null;
  if (showOnTablet && !isTablet) return null;
  if (showOnDesktop && !isDesktop) return null;

  // Build responsive classes
  const responsiveClasses = [];

  // Custom responsive classes
  if (mobile) responsiveClasses.push(mobile);
  if (tablet) responsiveClasses.push(`md:${tablet}`);
  if (desktop) responsiveClasses.push(`lg:${desktop}`);
  if (largeDesktop) responsiveClasses.push(`2xl:${largeDesktop}`);

  // Predefined responsive utilities
  if (spacing) {
    const spacingClasses = {
      xs: 'space-y-2 sm:space-y-3 lg:space-y-4',
      sm: 'space-y-3 sm:space-y-4 lg:space-y-6',
      md: 'space-y-4 sm:space-y-6 lg:space-y-8',
      lg: 'space-y-6 sm:space-y-8 lg:space-y-12',
      xl: 'space-y-8 sm:space-y-12 lg:space-y-16',
    };
    responsiveClasses.push(spacingClasses[spacing]);
  }

  if (padding) {
    const paddingClasses = {
      xs: 'p-2 sm:p-3 lg:p-4',
      sm: 'p-3 sm:p-4 lg:p-6',
      md: 'p-4 sm:p-6 lg:p-8',
      lg: 'p-6 sm:p-8 lg:p-12',
      xl: 'p-8 sm:p-12 lg:p-16',
    };
    responsiveClasses.push(paddingClasses[padding]);
  }

  if (margin) {
    const marginClasses = {
      xs: 'm-2 sm:m-3 lg:m-4',
      sm: 'm-3 sm:m-4 lg:m-6',
      md: 'm-4 sm:m-6 lg:m-8',
      lg: 'm-6 sm:m-8 lg:m-12',
      xl: 'm-8 sm:m-12 lg:m-16',
    };
    responsiveClasses.push(marginClasses[margin]);
  }

  if (text) {
    const textClasses = {
      xs: 'text-xs sm:text-sm lg:text-base',
      sm: 'text-sm sm:text-base lg:text-lg',
      md: 'text-base sm:text-lg lg:text-xl',
      lg: 'text-lg sm:text-xl lg:text-2xl',
      xl: 'text-xl sm:text-2xl lg:text-3xl',
      '2xl': 'text-2xl sm:text-3xl lg:text-4xl',
      '3xl': 'text-3xl sm:text-4xl lg:text-5xl',
    };
    responsiveClasses.push(textClasses[text]);
  }

  if (grid) {
    const gridClasses = {
      sm: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6',
      md: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8',
      lg: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 lg:gap-10',
      auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8',
    };
    responsiveClasses.push(gridClasses[grid]);
  }

  if (flex) {
    const flexClasses = {
      col: 'flex flex-col sm:flex-row',
      row: 'flex flex-row sm:flex-col lg:flex-row',
      wrap: 'flex flex-wrap gap-2 sm:gap-3 lg:gap-4',
      center: 'flex items-center justify-center',
      between: 'flex items-center justify-between',
      start: 'flex items-center justify-start',
      end: 'flex items-center justify-end',
    };
    responsiveClasses.push(flexClasses[flex]);
  }

  if (button) {
    const buttonClasses = {
      sm: 'px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-xs sm:text-sm lg:text-base',
      md: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-sm sm:text-base lg:text-lg',
      lg: 'px-6 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5 text-base sm:text-lg lg:text-xl',
    };
    responsiveClasses.push(buttonClasses[button]);
  }

  if (icon) {
    const iconClasses = {
      sm: 'w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5',
      md: 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6',
      lg: 'w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8',
    };
    responsiveClasses.push(iconClasses[icon]);
  }

  if (image) {
    const imageClasses = {
      sm: 'w-full h-32 sm:h-40 lg:h-48 object-cover',
      md: 'w-full h-40 sm:h-48 lg:h-56 object-cover',
      lg: 'w-full h-48 sm:h-56 lg:h-64 object-cover',
    };
    responsiveClasses.push(imageClasses[image]);
  }

  if (card) {
    const cardClasses = {
      sm: 'p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow',
      md: 'p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow',
      lg: 'p-6 sm:p-8 lg:p-12 rounded-lg shadow-sm hover:shadow-md transition-shadow',
    };
    responsiveClasses.push(cardClasses[card]);
  }

  if (modal) {
    const modalClasses = {
      sm: 'w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto',
      md: 'w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto',
      lg: 'w-full max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto',
    };
    responsiveClasses.push(modalClasses[modal]);
  }

  if (sidebar) {
    const sidebarClasses = {
      mobile: 'w-full max-w-sm',
      tablet: 'w-full sm:w-64 lg:w-80',
      desktop: 'w-64 lg:w-80',
    };
    responsiveClasses.push(sidebarClasses[sidebar]);
  }

  if (table) {
    const tableClasses = {
      sm: 'w-full text-xs sm:text-sm lg:text-base',
      md: 'w-full text-sm sm:text-base lg:text-lg',
      lg: 'w-full text-base sm:text-lg lg:text-xl',
    };
    responsiveClasses.push(tableClasses[table]);
  }

  if (input) {
    const inputClasses = {
      sm: 'px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-xs sm:text-sm lg:text-base',
      md: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-sm sm:text-base lg:text-lg',
      lg: 'px-6 py-3 sm:px-8 sm:py-4 lg:px-10 lg:py-5 text-base sm:text-lg lg:text-xl',
    };
    responsiveClasses.push(inputClasses[input]);
  }

  if (badge) {
    const badgeClasses = {
      sm: 'px-2 py-1 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 text-xs sm:text-sm lg:text-base',
      md: 'px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 text-sm sm:text-base lg:text-lg',
      lg: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-base sm:text-lg lg:text-xl',
    };
    responsiveClasses.push(badgeClasses[badge]);
  }

  if (tooltip) {
    const tooltipClasses = {
      sm: 'text-xs sm:text-sm lg:text-base',
      md: 'text-sm sm:text-base lg:text-lg',
      lg: 'text-base sm:text-lg lg:text-xl',
    };
    responsiveClasses.push(tooltipClasses[tooltip]);
  }

  if (skeleton) {
    const skeletonClasses = {
      text: 'h-4 sm:h-5 lg:h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
      image: 'h-32 sm:h-40 lg:h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
      card: 'h-48 sm:h-56 lg:h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
    };
    responsiveClasses.push(skeletonClasses[skeleton]);
  }

  if (animation) {
    const animationClasses = {
      transition: 'transition-all duration-200 ease-in-out',
      hover: 'hover:scale-105 hover:shadow-lg transition-transform duration-200 ease-in-out',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    };
    responsiveClasses.push(animationClasses[animation]);
  }

  if (accessibility) {
    const accessibilityClasses = {
      srOnly: 'sr-only',
      focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      highContrast: 'border-2 border-black',
      reducedMotion: 'transition-none',
    };
    responsiveClasses.push(accessibilityClasses[accessibility]);
  }

  if (print) {
    const printClasses = {
      hidden: 'print:hidden',
      visible: 'print:block',
      text: 'print:text-black print:bg-white',
    };
    responsiveClasses.push(printClasses[print]);
  }

  if (orientation) {
    const orientationClasses = {
      landscape: 'landscape:py-2',
      portrait: 'portrait:px-2',
    };
    responsiveClasses.push(orientationClasses[orientation]);
  }

  if (darkMode) {
    const darkModeClasses = {
      auto: 'dark:bg-gray-900 dark:text-white',
      manual: 'dark:bg-gray-800 dark:text-gray-100',
    };
    responsiveClasses.push(darkModeClasses[darkMode]);
  }

  if (highContrast) {
    const highContrastClasses = {
      enabled: 'border-2 border-black',
      disabled: 'border border-gray-300',
    };
    responsiveClasses.push(highContrastClasses[highContrast]);
  }

  if (reducedMotion) {
    const reducedMotionClasses = {
      enabled: 'transition-none',
      disabled: 'transition-all duration-200 ease-in-out',
    };
    responsiveClasses.push(reducedMotionClasses[reducedMotion]);
  }

  return (
    <Component
      className={cn(responsiveClasses.join(' '), className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ResponsiveWrapper;
