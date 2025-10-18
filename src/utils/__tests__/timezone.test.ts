/**
 * Tests for timezone utilities
 * Ensures consistent Tbilisi timezone handling across the application
 */

import {
  createTbilisiDate,
  createTbilisiDateTime,
  createTbilisiDateTimeFromStrings,
  formatTbilisiTime,
  formatTbilisiDate,
  formatTbilisiDateTime,
  toTbilisiTime,
  toUTC,
  getCurrentTbilisiTime,
  isTbilisiTime,
  toTbilisiISOString,
  parseTbilisiISOString,
  TBILISI_TIMEZONE,
  TBILISI_UTC_OFFSET
} from '../timezone';

describe('Timezone Utilities', () => {
  describe('Constants', () => {
    it('should have correct timezone constants', () => {
      expect(TBILISI_TIMEZONE).toBe('Asia/Tbilisi');
      expect(TBILISI_UTC_OFFSET).toBe(4);
    });
  });

  describe('createTbilisiDate', () => {
    it('should create current date in Tbilisi timezone', () => {
      const tbilisiDate = createTbilisiDate();
      expect(tbilisiDate).toBeInstanceOf(Date);
    });

    it('should create date from string in Tbilisi timezone', () => {
      const tbilisiDate = createTbilisiDate('2024-01-15T10:00:00Z');
      expect(tbilisiDate).toBeInstanceOf(Date);
    });
  });

  describe('createTbilisiDateTime', () => {
    it('should create datetime in Tbilisi timezone', () => {
      const tbilisiDate = createTbilisiDateTime(2024, 1, 15, 14, 30);
      expect(tbilisiDate).toBeInstanceOf(Date);
      expect(tbilisiDate.getFullYear()).toBe(2024);
      expect(tbilisiDate.getMonth()).toBe(0); // January is 0
      expect(tbilisiDate.getDate()).toBe(15);
    });
  });

  describe('createTbilisiDateTimeFromStrings', () => {
    it('should create datetime from date and time strings', () => {
      const tbilisiDate = createTbilisiDateTimeFromStrings('2024-01-15', '14:30');
      expect(tbilisiDate).toBeInstanceOf(Date);
    });

    it('should handle overnight bookings correctly', () => {
      const tbilisiDate = createTbilisiDateTimeFromStrings('2024-01-15', '02:00', true);
      expect(tbilisiDate).toBeInstanceOf(Date);
      expect(tbilisiDate.getDate()).toBe(16); // Next day
    });
  });

  describe('formatTbilisiTime', () => {
    it('should format time in Tbilisi timezone', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatTbilisiTime(date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
    });
  });

  describe('formatTbilisiDate', () => {
    it('should format date in Tbilisi timezone', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatTbilisiDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });
  });

  describe('formatTbilisiDateTime', () => {
    it('should format datetime in Tbilisi timezone', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatTbilisiDateTime(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toMatch(/\d{2}:\d{2}/); // Time format
    });
  });

  describe('toTbilisiTime', () => {
    it('should convert UTC date to Tbilisi time', () => {
      const utcDate = new Date('2024-01-15T10:00:00Z');
      const tbilisiDate = toTbilisiTime(utcDate);
      expect(tbilisiDate.getTime()).toBe(utcDate.getTime() + (4 * 3600000)); // +4 hours
    });
  });

  describe('toUTC', () => {
    it('should convert Tbilisi time to UTC', () => {
      const tbilisiDate = new Date('2024-01-15T14:00:00+04:00');
      const utcDate = toUTC(tbilisiDate);
      expect(utcDate.getTime()).toBe(tbilisiDate.getTime() - (4 * 3600000)); // -4 hours
    });
  });

  describe('getCurrentTbilisiTime', () => {
    it('should return current time in Tbilisi timezone', () => {
      const currentTime = getCurrentTbilisiTime();
      expect(currentTime).toBeInstanceOf(Date);
    });
  });

  describe('toTbilisiISOString', () => {
    it('should create ISO string in Tbilisi timezone', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const isoString = toTbilisiISOString(date);
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('parseTbilisiISOString', () => {
    it('should parse ISO string to Tbilisi timezone', () => {
      const isoString = '2024-01-15T14:00:00.000Z';
      const date = parseTbilisiISOString(isoString);
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('Overnight Booking Scenarios', () => {
    it('should handle overnight booking correctly', () => {
      // Test overnight booking: 23:00 to 02:00
      const arrivalDate = createTbilisiDateTimeFromStrings('2024-01-15', '23:00');
      const departureDate = createTbilisiDateTimeFromStrings('2024-01-15', '02:00', true);
      
      expect(arrivalDate.getDate()).toBe(15);
      expect(departureDate.getDate()).toBe(16);
      
      const duration = departureDate.getTime() - arrivalDate.getTime();
      const durationHours = duration / (1000 * 60 * 60);
      expect(durationHours).toBe(3); // 3 hours duration
    });

    it('should handle same-day booking correctly', () => {
      // Test same-day booking: 14:00 to 16:00
      const arrivalDate = createTbilisiDateTimeFromStrings('2024-01-15', '14:00');
      const departureDate = createTbilisiDateTimeFromStrings('2024-01-15', '16:00');
      
      expect(arrivalDate.getDate()).toBe(15);
      expect(departureDate.getDate()).toBe(15);
      
      const duration = departureDate.getTime() - arrivalDate.getTime();
      const durationHours = duration / (1000 * 60 * 60);
      expect(durationHours).toBe(2); // 2 hours duration
    });
  });
});
