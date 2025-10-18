import { ka } from 'date-fns/locale';
import { format } from 'date-fns';
import i18n from '@/i18n/config';

// Georgian locale configuration for date-fns with ordinal indicators disabled
export const georgianLocale = {
  ...ka,
  // Override ordinal formatting to remove ordinal indicators
  localize: {
    ...ka.localize,
    ordinalNumber: (dirtyNumber: number, _options: any) => {
      // Return just the number without ordinal suffix
      return dirtyNumber.toString();
    }
  }
};

// Function to get the current locale based on i18n language
export const getCurrentLocale = () => {
  return i18n.language === 'ka' ? georgianLocale : undefined;
};

// Function to format date with proper locale
export const formatDateWithLocale = (date: Date, formatString: string) => {
  const locale = getCurrentLocale();
  return format(date, formatString, { locale });
};

// Function to format month name
export const formatMonth = (date: Date) => {
  return formatDateWithLocale(date, 'MMMM');
};

// Function to format month and year
export const formatMonthYear = (date: Date) => {
  return formatDateWithLocale(date, 'MMMM yyyy');
};

// Function to format full date
export const formatFullDate = (date: Date) => {
  return formatDateWithLocale(date, 'EEEE, MMMM d, yyyy');
};
