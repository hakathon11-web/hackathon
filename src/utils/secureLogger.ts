/**
 * Secure Logger Utility (DEPRECATED)
 * 
 * This utility is deprecated. Please use the new logger from '@/utils/logger' instead.
 * 
 * The new logger provides:
 * - Environment-aware logging (development vs production)
 * - Automatic data sanitization
 * - Proper log levels
 * - Better performance
 * 
 * Migration:
 * - Replace secureLog() with logger.debug() or logger.info()
 * - Replace secureError() with logger.error()
 * - Replace secureWarn() with logger.warn()
 */

// List of sensitive data patterns to sanitize
const SENSITIVE_PATTERNS = [
  // Authentication tokens and keys
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /auth/i,
  /session/i,
  /jwt/i,
  /bearer/i,
  
  // Personal information
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /credit.*card/i,
  /card.*number/i,
  /cvv/i,
  /cvc/i,
  
  // API keys and credentials
  /api.*key/i,
  /access.*key/i,
  /private.*key/i,
  /client.*secret/i,
  
  // Database identifiers that might be sensitive
  /user.*id/i,
  /customer.*id/i,
  /payment.*id/i,
  /booking.*id/i,
];

// Function to sanitize sensitive data
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if string contains sensitive patterns
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(data));
    if (isSensitive) {
      return '[SENSITIVE_DATA_REDACTED]';
    }
    return data;
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[SENSITIVE_DATA_REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Import the new logger
import { logger } from './logger';

// Secure logging functions (now using the new logger)
export const secureLog = (...args: any[]): void => {
  logger.debug(...args);
};

export const secureError = (...args: any[]): void => {
  logger.error(...args);
};

export const secureWarn = (...args: any[]): void => {
  logger.warn(...args);
};

export const secureInfo = (...args: any[]): void => {
  logger.info(...args);
};

// Utility function to check if data contains sensitive information
export const containsSensitiveData = (data: any): boolean => {
  const sanitized = sanitizeData(data);
  return JSON.stringify(sanitized) !== JSON.stringify(data);
};

// Utility function to create safe log messages
export const createSafeLogMessage = (message: string, data?: any): string => {
  if (!data) {
    return message;
  }
  
  const sanitized = sanitizeData(data);
  return `${message}: ${JSON.stringify(sanitized)}`;
};

// Export default secure logger object
export default {
  log: secureLog,
  error: secureError,
  warn: secureWarn,
  info: secureInfo,
  containsSensitiveData,
  createSafeLogMessage,
};
