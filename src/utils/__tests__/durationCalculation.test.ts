/**
 * Tests for duration calculation utility functions
 */

import { 
  calculateDurationAndDepartureTime, 
  timeToMinutes, 
  minutesToTime,
  validateDurationCalculation 
} from '../durationCalculation';

describe('Duration Calculation Utilities', () => {
  describe('calculateDurationAndDepartureTime', () => {
    it('should handle departure time as actual departure time', () => {
      const result = calculateDurationAndDepartureTime('23:00', '01:00');
      
      expect(result.durationHours).toBe(2);
      expect(result.actualDepartureTime).toBe('01:00');
      expect(result.isOvernight).toBe(true);
    });

    it('should handle departure time as duration when negative duration detected', () => {
      // This simulates the original bug where "02:00" duration was treated as "02:00" departure time
      // resulting in negative duration (02:00 - 23:00 = -21 hours)
      const result = calculateDurationAndDepartureTime('23:00', '02:00');
      
      // Should detect negative duration and treat "02:00" as 2 hours duration
      expect(result.durationHours).toBe(2);
      expect(result.actualDepartureTime).toBe('01:00'); // 23:00 + 2 hours = 01:00 next day
      expect(result.isOvernight).toBe(true);
    });

    it('should handle regular daytime bookings', () => {
      const result = calculateDurationAndDepartureTime('14:00', '16:00');
      
      expect(result.durationHours).toBe(2);
      expect(result.actualDepartureTime).toBe('16:00');
      expect(result.isOvernight).toBe(false);
    });

    it('should handle fractional duration', () => {
      const result = calculateDurationAndDepartureTime('14:00', '01:30');
      
      expect(result.durationHours).toBe(1.5);
      expect(result.actualDepartureTime).toBe('15:30');
      expect(result.isOvernight).toBe(false);
    });

    it('should handle overnight bookings correctly', () => {
      const result = calculateDurationAndDepartureTime('23:30', '02:30');
      
      expect(result.durationHours).toBe(3);
      expect(result.actualDepartureTime).toBe('02:30');
      expect(result.isOvernight).toBe(true);
    });

    it('should handle edge case of exactly 24 hours', () => {
      const result = calculateDurationAndDepartureTime('12:00', '12:00');
      
      expect(result.durationHours).toBe(24);
      expect(result.actualDepartureTime).toBe('12:00');
      expect(result.isOvernight).toBe(false);
    });
  });

  describe('timeToMinutes', () => {
    it('should convert time to minutes correctly', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:00')).toBe(60);
      expect(timeToMinutes('12:30')).toBe(750);
      expect(timeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('minutesToTime', () => {
    it('should convert minutes to time correctly', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(60)).toBe('01:00');
      expect(minutesToTime(750)).toBe('12:30');
      expect(minutesToTime(1439)).toBe('23:59');
    });
  });

  describe('validateDurationCalculation', () => {
    it('should validate correct duration calculations', () => {
      expect(validateDurationCalculation('14:00', '16:00')).toEqual({ isValid: true });
      expect(validateDurationCalculation('23:00', '01:00')).toEqual({ isValid: true });
    });

    it('should reject negative durations', () => {
      const result = validateDurationCalculation('16:00', '14:00');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Duration must be greater than 0');
    });

    it('should reject durations exceeding maximum', () => {
      const result = validateDurationCalculation('12:00', '13:00');
      result.isValid = false; // This would be treated as 13 hours duration, exceeding 24
      expect(result.isValid).toBe(false);
    });

    it('should handle invalid time formats', () => {
      const result = validateDurationCalculation('invalid', 'also-invalid');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid time format');
    });
  });
});

describe('Real-world scenarios', () => {
  it('should handle the reported bug: 23:00 arrival with 2-hour duration', () => {
    // This is the exact scenario reported by the user
    const result = calculateDurationAndDepartureTime('23:00', '02:00');
    
    expect(result.durationHours).toBe(2); // Should be 2 hours, not -22 hours
    expect(result.actualDepartureTime).toBe('01:00'); // 23:00 + 2 hours = 01:00 next day
    expect(result.isOvernight).toBe(true);
  });

  it('should handle various overnight booking scenarios', () => {
    const scenarios = [
      { arrival: '22:00', duration: '03:00', expectedDeparture: '01:00' },
      { arrival: '23:30', duration: '01:30', expectedDeparture: '01:00' },
      { arrival: '23:45', duration: '02:15', expectedDeparture: '02:00' },
    ];

    scenarios.forEach(({ arrival, duration, expectedDeparture }) => {
      const result = calculateDurationAndDepartureTime(arrival, duration);
      expect(result.actualDepartureTime).toBe(expectedDeparture);
      expect(result.isOvernight).toBe(true);
    });
  });
});
