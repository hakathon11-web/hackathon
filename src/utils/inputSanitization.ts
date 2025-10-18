/**
 * Input Sanitization Utility
 * 
 * This utility provides functions to sanitize user input and prevent SQL injection
 * attacks and other security vulnerabilities.
 */

// Regular expressions for input validation and sanitization
const PATTERNS = {
  // SQL injection patterns
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(--)|(\/\*)|(\*\/)|(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  
  // XSS patterns
  XSS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  
  // Dangerous characters
  DANGEROUS_CHARS: /[<>'"&]/g,
  
  // Username validation (alphanumeric, underscore, hyphen, dot)
  USERNAME: /^[a-zA-Z0-9._-]+$/,
  
  // Business name validation (letters, numbers, spaces, common punctuation)
  BUSINESS_NAME: /^[a-zA-Z0-9\s.,'\-&()]+$/,
  
  // Search query validation (letters, numbers, spaces, common punctuation)
  SEARCH_QUERY: /^[a-zA-Z0-9\s.,'\-&()!?]+$/,
};

/**
 * Sanitizes a string by removing or escaping dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(PATTERNS.SQL_INJECTION, '')
    .replace(PATTERNS.XSS, '')
    .replace(PATTERNS.DANGEROUS_CHARS, '')
    .substring(0, 255); // Limit length
}

/**
 * Sanitizes a username for database queries
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }
  
  const sanitized = username.trim().toLowerCase();
  
  // Validate username format
  if (!PATTERNS.USERNAME.test(sanitized)) {
    throw new Error('Invalid username format');
  }
  
  // Check for SQL injection patterns
  if (PATTERNS.SQL_INJECTION.test(sanitized)) {
    throw new Error('Invalid username: contains dangerous characters');
  }
  
  return sanitized;
}

/**
 * Sanitizes a business name for database queries
 */
export function sanitizeBusinessName(businessName: string): string {
  if (typeof businessName !== 'string') {
    return '';
  }
  
  const sanitized = businessName.trim();
  
  // Validate business name format
  if (!PATTERNS.BUSINESS_NAME.test(sanitized)) {
    throw new Error('Invalid business name format');
  }
  
  // Check for SQL injection patterns
  if (PATTERNS.SQL_INJECTION.test(sanitized)) {
    throw new Error('Invalid business name: contains dangerous characters');
  }
  
  return sanitized;
}

/**
 * Sanitizes a search query for database queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  const sanitized = query.trim();
  
  // Validate search query format
  if (!PATTERNS.SEARCH_QUERY.test(sanitized)) {
    throw new Error('Invalid search query format');
  }
  
  // Check for SQL injection patterns
  if (PATTERNS.SQL_INJECTION.test(sanitized)) {
    throw new Error('Invalid search query: contains dangerous characters');
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes any string input
 */
export function validateAndSanitize(input: string, type: 'username' | 'businessName' | 'searchQuery' | 'general'): string {
  switch (type) {
    case 'username':
      return sanitizeUsername(input);
    case 'businessName':
      return sanitizeBusinessName(input);
    case 'searchQuery':
      return sanitizeSearchQuery(input);
    case 'general':
    default:
      return sanitizeString(input);
  }
}

/**
 * Checks if input contains potentially dangerous patterns
 */
export function containsDangerousPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  return PATTERNS.SQL_INJECTION.test(input) || 
         PATTERNS.XSS.test(input) ||
         PATTERNS.DANGEROUS_CHARS.test(input);
}

/**
 * Safe parameterized query builder for Supabase
 * This ensures that user input is properly escaped
 */
export function buildSafeQuery(baseQuery: any, field: string, value: string, operator: 'eq' | 'ilike' | 'like' = 'eq'): any {
  const sanitizedValue = sanitizeString(value);
  
  if (!sanitizedValue) {
    throw new Error('Invalid input value');
  }
  
  switch (operator) {
    case 'eq':
      return baseQuery.eq(field, sanitizedValue);
    case 'ilike':
      return baseQuery.ilike(field, `%${sanitizedValue}%`);
    case 'like':
      return baseQuery.like(field, `%${sanitizedValue}%`);
    default:
      throw new Error('Unsupported query operator');
  }
}

/**
 * Safe username query for employee authentication
 */
export function buildSafeUsernameQuery(baseQuery: any, username: string): any {
  const sanitizedUsername = sanitizeUsername(username);
  return baseQuery.eq('username', sanitizedUsername);
}

/**
 * Safe search query for venue names
 */
export function buildSafeVenueSearchQuery(baseQuery: any, query: string): any {
  const sanitizedQuery = sanitizeSearchQuery(query);
  return baseQuery.ilike('name', `%${sanitizedQuery}%`);
}

/**
 * Safe business name query
 */
export function buildSafeBusinessNameQuery(baseQuery: any, businessName: string): any {
  const sanitizedBusinessName = sanitizeBusinessName(businessName);
  return baseQuery.ilike('name', `%${sanitizedBusinessName}%`);
}

export default {
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
};
