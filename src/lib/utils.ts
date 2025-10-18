import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with proper translation
 * @param amount - The amount to format
 * @param currencyText - The currency text from translation (e.g., t('booking.currency'))
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, currencyText: string): string {
  return `${amount} ${currencyText}`;
}
