/**
 * Tests for Input Sanitization Utility
 * 
 * These tests verify that the input sanitization functions properly prevent
 * SQL injection attacks and other security vulnerabilities.
 */

import {
  sanitizeString,
  sanitizeUsername,
  sanitizeBusinessName,
  sanitizeSearchQuery,
  validateAndSanitize,
  containsDangerousPatterns,
  buildSafeQuery,
  buildSafeUsernameQuery,
  buildSafeVenueSearchQuery,
  buildSafeBusinessNameQuery,
} from '../inputSanitization';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should remove SQL injection patterns', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = sanitizeString(maliciousInput);
      expect(result).toBe('');
    });

    it('should remove XSS patterns', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = sanitizeString(maliciousInput);
      expect(result).toBe('');
    });

    it('should remove dangerous characters', () => {
      const maliciousInput = 'test<>"&\'';
      const result = sanitizeString(maliciousInput);
      expect(result).toBe('test');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = sanitizeString(input);
      expect(result).toBe('test');
    });

    it('should limit length to 255 characters', () => {
      const longInput = 'a'.repeat(300);
      const result = sanitizeString(longInput);
      expect(result.length).toBe(255);
    });
  });

  describe('sanitizeUsername', () => {
    it('should accept valid usernames', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'user.name'];
      validUsernames.forEach(username => {
        expect(() => sanitizeUsername(username)).not.toThrow();
        expect(sanitizeUsername(username)).toBe(username.toLowerCase());
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'user@domain.com',
        'user with spaces',
        'user<script>',
        'user; DROP TABLE users;',
        'user\' OR 1=1 --',
      ];
      invalidUsernames.forEach(username => {
        expect(() => sanitizeUsername(username)).toThrow();
      });
    });

    it('should convert to lowercase', () => {
      const result = sanitizeUsername('USER123');
      expect(result).toBe('user123');
    });
  });

  describe('sanitizeBusinessName', () => {
    it('should accept valid business names', () => {
      const validNames = [
        'Test Business',
        'Business & Co.',
        'Test-Business (LLC)',
        'Business, Inc.',
      ];
      validNames.forEach(name => {
        expect(() => sanitizeBusinessName(name)).not.toThrow();
        expect(sanitizeBusinessName(name)).toBe(name);
      });
    });

    it('should reject invalid business names', () => {
      const invalidNames = [
        'Business<script>',
        'Business; DROP TABLE venues;',
        'Business\' OR 1=1 --',
      ];
      invalidNames.forEach(name => {
        expect(() => sanitizeBusinessName(name)).toThrow();
      });
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should accept valid search queries', () => {
      const validQueries = [
        'restaurant',
        'coffee shop',
        'gaming venue',
        'test & more',
        'test (location)',
      ];
      validQueries.forEach(query => {
        expect(() => sanitizeSearchQuery(query)).not.toThrow();
        expect(sanitizeSearchQuery(query)).toBe(query);
      });
    });

    it('should reject invalid search queries', () => {
      const invalidQueries = [
        'search<script>',
        'search; DROP TABLE venues;',
        'search\' OR 1=1 --',
      ];
      invalidQueries.forEach(query => {
        expect(() => sanitizeSearchQuery(query)).toThrow();
      });
    });
  });

  describe('containsDangerousPatterns', () => {
    it('should detect SQL injection patterns', () => {
      const dangerousInputs = [
        'test; DROP TABLE users;',
        'test\' OR 1=1 --',
        'test UNION SELECT * FROM users',
        'test<script>alert("xss")</script>',
      ];
      dangerousInputs.forEach(input => {
        expect(containsDangerousPatterns(input)).toBe(true);
      });
    });

    it('should not flag safe inputs', () => {
      const safeInputs = [
        'normal text',
        'user123',
        'business name',
        'search query',
      ];
      safeInputs.forEach(input => {
        expect(containsDangerousPatterns(input)).toBe(false);
      });
    });
  });

  describe('buildSafeQuery', () => {
    it('should build safe eq queries', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };
      
      buildSafeQuery(mockQuery, 'username', 'testuser', 'eq');
      expect(mockQuery.eq).toHaveBeenCalledWith('username', 'testuser');
    });

    it('should build safe ilike queries', () => {
      const mockQuery = {
        ilike: jest.fn().mockReturnThis(),
      };
      
      buildSafeQuery(mockQuery, 'name', 'test', 'ilike');
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%test%');
    });

    it('should throw error for malicious input', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };
      
      expect(() => {
        buildSafeQuery(mockQuery, 'username', 'test; DROP TABLE users;', 'eq');
      }).toThrow();
    });
  });

  describe('buildSafeUsernameQuery', () => {
    it('should build safe username queries', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };
      
      buildSafeUsernameQuery(mockQuery, 'testuser');
      expect(mockQuery.eq).toHaveBeenCalledWith('username', 'testuser');
    });

    it('should throw error for invalid username', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };
      
      expect(() => {
        buildSafeUsernameQuery(mockQuery, 'test; DROP TABLE users;');
      }).toThrow();
    });
  });

  describe('buildSafeVenueSearchQuery', () => {
    it('should build safe venue search queries', () => {
      const mockQuery = {
        ilike: jest.fn().mockReturnThis(),
      };
      
      buildSafeVenueSearchQuery(mockQuery, 'restaurant');
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%restaurant%');
    });

    it('should throw error for malicious search query', () => {
      const mockQuery = {
        ilike: jest.fn().mockReturnThis(),
      };
      
      expect(() => {
        buildSafeVenueSearchQuery(mockQuery, 'search; DROP TABLE venues;');
      }).toThrow();
    });
  });

  describe('buildSafeBusinessNameQuery', () => {
    it('should build safe business name queries', () => {
      const mockQuery = {
        ilike: jest.fn().mockReturnThis(),
      };
      
      buildSafeBusinessNameQuery(mockQuery, 'Test Business');
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%Test Business%');
    });

    it('should throw error for malicious business name', () => {
      const mockQuery = {
        ilike: jest.fn().mockReturnThis(),
      };
      
      expect(() => {
        buildSafeBusinessNameQuery(mockQuery, 'Business; DROP TABLE venues;');
      }).toThrow();
    });
  });

  describe('validateAndSanitize', () => {
    it('should validate and sanitize different input types', () => {
      expect(validateAndSanitize('testuser', 'username')).toBe('testuser');
      expect(validateAndSanitize('Test Business', 'businessName')).toBe('Test Business');
      expect(validateAndSanitize('search query', 'searchQuery')).toBe('search query');
      expect(validateAndSanitize('general text', 'general')).toBe('general text');
    });

    it('should throw error for invalid input types', () => {
      expect(() => validateAndSanitize('test; DROP TABLE users;', 'username')).toThrow();
      expect(() => validateAndSanitize('Business<script>', 'businessName')).toThrow();
      expect(() => validateAndSanitize('search; DROP TABLE venues;', 'searchQuery')).toThrow();
    });
  });
});

// Integration tests for real-world scenarios
describe('SQL Injection Prevention Integration Tests', () => {
  const maliciousInputs = [
    "'; DROP TABLE users; --",
    "' OR 1=1 --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "admin' OR '1'='1",
    "'; INSERT INTO users (username) VALUES ('hacker'); --",
    "<script>alert('xss')</script>",
    "test'; DELETE FROM venues; --",
  ];

  describe('Username sanitization', () => {
    maliciousInputs.forEach(maliciousInput => {
      it(`should prevent SQL injection with input: ${maliciousInput}`, () => {
        expect(() => sanitizeUsername(maliciousInput)).toThrow();
      });
    });
  });

  describe('Business name sanitization', () => {
    maliciousInputs.forEach(maliciousInput => {
      it(`should prevent SQL injection with input: ${maliciousInput}`, () => {
        expect(() => sanitizeBusinessName(maliciousInput)).toThrow();
      });
    });
  });

  describe('Search query sanitization', () => {
    maliciousInputs.forEach(maliciousInput => {
      it(`should prevent SQL injection with input: ${maliciousInput}`, () => {
        expect(() => sanitizeSearchQuery(maliciousInput)).toThrow();
      });
    });
  });
});
