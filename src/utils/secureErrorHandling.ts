/**
 * Client-side Secure Error Handling Utility
 * 
 * This utility provides secure error handling for client-side code that:
 * - Sanitizes error messages before displaying to users
 * - Logs detailed error information for debugging
 * - Prevents sensitive information from being exposed in UI
 */

export interface ClientErrorContext {
  componentName: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Generic error messages for common scenarios
 */
export const CLIENT_ERROR_MESSAGES = {
  // Network errors
  'Network error': 'Unable to connect to the server. Please check your internet connection.',
  'Request failed': 'Request failed. Please try again.',
  'Timeout': 'Request timed out. Please try again.',
  
  // Authentication errors
  'Authentication failed': 'Invalid credentials. Please try again.',
  'Session expired': 'Your session has expired. Please sign in again.',
  'Unauthorized': 'You are not authorized to perform this action.',
  
  // Validation errors
  'Validation failed': 'Please check your input and try again.',
  'Invalid data': 'Please check your input and try again.',
  'Required field missing': 'Please fill in all required fields.',
  
  // Server errors
  'Internal server error': 'Something went wrong. Please try again later.',
  'Service unavailable': 'Service is temporarily unavailable. Please try again later.',
  
  // Generic fallback
  'default': 'An unexpected error occurred. Please try again.'
} as const;

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /database/i,
  /table/i,
  /column/i,
  /constraint/i,
  /foreign key/i,
  /primary key/i,
  /index/i,
  /schema/i,
  /connection.*timeout/i,
  /environment/i,
  /config/i,
  /secret/i,
  /key/i,
  /token/i,
  /api/i,
  /endpoint/i,
  /url/i,
  /path/i,
  /file system/i,
  /permission/i,
  /access denied/i,
  /unauthorized/i,
  /forbidden/i,
  /internal server/i,
  /stack trace/i,
  /line \d+/i,
  /at \w+/i,
  /\.ts:\d+/i,
  /\.js:\d+/i,
  /node_modules/i,
  /supabase/i,
  /stripe/i,
  /resend/i,
  /deno/i,
  /edge function/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /192\.168\./i,
  /10\./i,
  /172\./i
];

/**
 * Checks if an error message contains sensitive information
 */
function isSensitiveError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerMessage));
}

/**
 * Sanitizes an error message for client display
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return CLIENT_ERROR_MESSAGES.default;
  }
  
  // Check for sensitive patterns
  if (isSensitiveError(message)) {
    return CLIENT_ERROR_MESSAGES.default;
  }
  
  // Check for exact matches with generic messages
  for (const [key, genericMessage] of Object.entries(CLIENT_ERROR_MESSAGES)) {
    if (key !== 'default' && message.toLowerCase().includes(key.toLowerCase())) {
      return genericMessage;
    }
  }
  
  // Remove any remaining sensitive information
  let sanitized = message
    .replace(/at \w+ \(.*?\)/g, '') // Remove stack trace locations
    .replace(/line \d+/gi, '') // Remove line numbers
    .replace(/\.ts:\d+/gi, '') // Remove TypeScript file references
    .replace(/\.js:\d+/gi, '') // Remove JavaScript file references
    .replace(/node_modules\/.*?\/.*?/g, '') // Remove node_modules paths
    .replace(/supabase.*?\.co/gi, '[REDACTED]') // Remove Supabase URLs
    .replace(/stripe.*?\.com/gi, '[REDACTED]') // Remove Stripe URLs
    .replace(/resend.*?\.com/gi, '[REDACTED]') // Remove Resend URLs
    .replace(/localhost:\d+/gi, '[REDACTED]') // Remove localhost URLs
    .replace(/127\.0\.0\.1:\d+/gi, '[REDACTED]') // Remove local IPs
    .trim();
  
  // Limit message length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized || CLIENT_ERROR_MESSAGES.default;
}

/**
 * Logs detailed error information for debugging
 */
export function logClientError(error: Error, context: ClientErrorContext): void {
  const logData = {
    timestamp: new Date().toISOString(),
    componentName: context.componentName,
    action: context.action,
    errorType: error.constructor.name,
    errorMessage: error.message,
    stack: error.stack,
    userId: context.userId,
    additionalData: context.additionalData,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🔒 CLIENT ERROR LOG:', logData);
  }
  
  // In production, you might want to send this to a logging service
  // but be careful not to expose sensitive information
}

/**
 * Creates a sanitized error message for user display
 */
export function createClientErrorMessage(
  error: Error | string,
  context: ClientErrorContext
): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Log detailed error for debugging
  if (error instanceof Error) {
    logClientError(error, context);
  }
  
  // Return sanitized message for user display
  return sanitizeErrorMessage(errorMessage);
}

/**
 * Handles API errors securely
 */
export function handleApiError(
  error: any,
  context: ClientErrorContext
): { userMessage: string; shouldRetry: boolean } {
  const errorMessage = error?.message || error?.error || String(error);
  
  // Log the error
  if (error instanceof Error) {
    logClientError(error, context);
  } else {
    console.error('🔒 API ERROR LOG:', {
      ...context,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
  
  // Determine if the user should retry
  const shouldRetry = !errorMessage.toLowerCase().includes('validation') &&
                     !errorMessage.toLowerCase().includes('unauthorized') &&
                     !errorMessage.toLowerCase().includes('forbidden');
  
  return {
    userMessage: sanitizeErrorMessage(errorMessage),
    shouldRetry
  };
}

/**
 * Wraps async functions with secure error handling
 */
export function withSecureClientErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ClientErrorContext
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const userMessage = createClientErrorMessage(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      
      // Re-throw with sanitized message
      throw new Error(userMessage);
    }
  };
}
