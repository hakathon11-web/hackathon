/**
 * Tests for booking datetime utilities
 * Verifies that overnight bookings are handled correctly
 */

import {
  parseBookingServiceDateTime,
  formatBookingTimeRange,
  isBookingServiceActive,
  hasBookingServicePassed,
  getLatestDepartureTime,
  validateBookingServiceDateTime
} from '../bookingDateTime';

describe('Booking DateTime Utilities', () => {
  describe('parseBookingServiceDateTime', () => {
    it('should handle same-day bookings correctly', () => {
      const result = parseBookingServiceDateTime(
        '2024-01-15T14:00:00Z',
        '2024-01-15T16:00:00Z'
      );

      expect(result.isOvernight).toBe(false);
      expect(result.durationHours).toBe(2);
      expect(result.durationMinutes).toBe(120);
      expect(result.arrivalDateTime.getDate()).toBe(15);
      expect(result.departureDateTime.getDate()).toBe(15);
    });

    it('should handle overnight bookings correctly', () => {
      const result = parseBookingServiceDateTime(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z'
      );

      expect(result.isOvernight).toBe(true);
      expect(result.durationHours).toBe(3);
      expect(result.durationMinutes).toBe(180);
      expect(result.arrivalDateTime.getDate()).toBe(15);
      expect(result.departureDateTime.getDate()).toBe(16);
    });
  });

  describe('formatBookingTimeRange', () => {
    it('should format same-day bookings without overnight indicator', () => {
      const result = formatBookingTimeRange(
        '2024-01-15T14:00:00Z',
        '2024-01-15T16:00:00Z',
        { showOvernightIndicator: true }
      );

      expect(result).toBe('14:00 - 16:00');
    });

    it('should format overnight bookings without overnight indicator', () => {
      const result = formatBookingTimeRange(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        { showOvernightIndicator: true }
      );

      expect(result).toBe('23:00 - 02:00');
    });

    it('should format with date when requested', () => {
      const result = formatBookingTimeRange(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        { showDate: true, showOvernightIndicator: true }
      );

      expect(result).toContain('Jan 15');
      expect(result).toContain('Jan 16');
      expect(result).toContain('23:00');
      expect(result).toContain('02:00');
    });

    it('should format with duration when requested', () => {
      const result = formatBookingTimeRange(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        { showDuration: true }
      );

      expect(result).toContain('3h');
    });
  });

  describe('isBookingServiceActive', () => {
    it('should return true for active same-day booking', () => {
      const currentTime = new Date('2024-01-15T15:00:00Z');
      const result = isBookingServiceActive(
        '2024-01-15T14:00:00Z',
        '2024-01-15T16:00:00Z',
        currentTime
      );

      expect(result).toBe(true);
    });

    it('should return true for active overnight booking', () => {
      const currentTime = new Date('2024-01-16T01:00:00Z');
      const result = isBookingServiceActive(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        currentTime
      );

      expect(result).toBe(true);
    });

    it('should return false for completed booking', () => {
      const currentTime = new Date('2024-01-16T03:00:00Z');
      const result = isBookingServiceActive(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        currentTime
      );

      expect(result).toBe(false);
    });
  });

  describe('hasBookingServicePassed', () => {
    it('should return false for future booking', () => {
      const currentTime = new Date('2024-01-15T22:00:00Z');
      const result = hasBookingServicePassed(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        currentTime
      );

      expect(result).toBe(false);
    });

    it('should return true for passed overnight booking', () => {
      const currentTime = new Date('2024-01-16T03:00:00Z');
      const result = hasBookingServicePassed(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z',
        currentTime
      );

      expect(result).toBe(true);
    });
  });

  describe('getLatestDepartureTime', () => {
    it('should return the latest departure time across multiple services', () => {
      const services = [
        {
          arrival_datetime: '2024-01-15T14:00:00Z',
          departure_datetime: '2024-01-15T16:00:00Z'
        },
        {
          arrival_datetime: '2024-01-15T23:00:00Z',
          departure_datetime: '2024-01-16T02:00:00Z'
        }
      ];

      const result = getLatestDepartureTime(services);
      expect(result?.toISOString()).toBe('2024-01-16T02:00:00.000Z');
    });

    it('should return null for empty services array', () => {
      const result = getLatestDepartureTime([]);
      expect(result).toBeNull();
    });
  });

  describe('validateBookingServiceDateTime', () => {
    it('should return valid for consistent datetime fields', () => {
      const result = validateBookingServiceDateTime(
        '2024-01-15T23:00:00Z',
        '2024-01-16T02:00:00Z'
      );

      expect(result.isValid).toBe(true);
    });

    it('should return invalid for inconsistent datetime fields', () => {
      const result = validateBookingServiceDateTime(
        '2024-01-15T23:00:00Z',
        '2024-01-15T02:00:00Z' // Wrong - should be next day
      );

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('after arrival time');
    });
  });
});
