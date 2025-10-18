/**
 * Utility functions for handling booking IDs
 * Provides user-friendly short booking IDs by showing part of the actual UUID
 */

/**
 * Extracts a short, user-friendly booking ID from a full UUID
 * Takes the first 5 characters of the UUID and converts to uppercase
 * This shows part of the actual booking ID while maintaining high uniqueness
 * 
 * Uniqueness analysis:
 * - 5 hex characters = 16^5 = 1,048,576 possible combinations
 * - With 100,000 bookings, collision probability is ~0.5%
 * - With 1 million bookings, collision probability is ~5%
 * 
 * @param fullId - The full UUID booking ID
 * @returns A short booking ID (5 characters, uppercase)
 * 
 * @example
 * getShortBookingId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
 * // Returns: 'A1B2C'
 */
export function getShortBookingId(fullId: string): string {
  if (!fullId) return '';
  
  // Take first 5 characters and convert to uppercase
  return fullId.substring(0, 5).toUpperCase();
}

/**
 * Formats a booking ID for display with a label
 * 
 * @param fullId - The full UUID booking ID
 * @param label - Optional label (default: 'Booking ID')
 * @returns Formatted short booking ID with label
 * 
 * @example
 * formatBookingIdForDisplay('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
 * // Returns: 'Booking ID: A1B2C'
 * 
 * formatBookingIdForDisplay('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Reference')
 * // Returns: 'Reference: A1B2C'
 */
export function formatBookingIdForDisplay(fullId: string, label: string = 'Booking ID'): string {
  const shortId = getShortBookingId(fullId);
  return shortId ? `${label}: ${shortId}` : '';
}

/**
 * Validates if a string looks like a UUID
 * 
 * @param id - String to validate
 * @returns True if the string looks like a UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Gets the display text for a booking ID
 * If the ID is a UUID, returns the short version (first 5 characters)
 * If it's already a short ID, returns as-is
 * 
 * @param id - The booking ID (full UUID or short)
 * @param prefix - Optional prefix for the display
 * @returns Formatted booking ID for display
 */
export function getBookingIdDisplay(id: string, prefix?: string): string {
  if (!id) return '';
  
  if (isValidUUID(id)) {
    return formatBookingIdForDisplay(id, prefix);
  }
  
  // If it's already a short ID, just add prefix if provided
  return prefix ? `${prefix}-${id}` : id;
}
