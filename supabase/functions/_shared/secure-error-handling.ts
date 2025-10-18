/**
 * Secure Error Handling Utility
 * 
 * This utility provides secure error handling that:
 * - Returns generic error messages to clients
 * - Logs detailed error information for administrators
 * - Prevents information disclosure through error messages
 */

export interface SecureErrorResponse {
  error: string;
  status: number;
  headers: Record<string, string>;
}

export interface ErrorContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Maps specific error types to generic user-friendly messages
 */
const ERROR_MESSAGES = {
  // Authentication errors
  'Authentication failed': 'Invalid credentials. Please try again.',
  'No authorization header provided': 'Authentication required. Please sign in.',
  'User not found': 'Invalid credentials. Please try again.',
  'Token expired': 'Your session has expired. Please sign in again.',
  
  // Database errors
  'Database connection failed': 'Service temporarily unavailable. Please try again later.',
  'Database insert error': 'Unable to save data. Please try again.',
  'Database update error': 'Unable to update data. Please try again.',
  'Database delete error': 'Unable to delete data. Please try again.',
  'Database query error': 'Unable to retrieve data. Please try again.',
  
  // Validation errors
  'Missing required fields': 'Please fill in all required fields.',
  'Invalid email format': 'Please enter a valid email address.',
  'Invalid data format': 'Please check your input and try again.',
  'Data validation failed': 'Please check your input and try again.',
  
  // Payment errors
  'Payment processing failed': 'Payment could not be processed. Please try again.',
  'Payment method not found': 'Payment method not found. Please add a new payment method.',
  'Payment declined': 'Payment was declined. Please try a different payment method.',
  
  // File upload errors
  'File upload failed': 'Unable to upload file. Please try again.',
  'Invalid file type': 'File type not supported. Please choose a different file.',
  'File too large': 'File is too large. Please choose a smaller file.',
  
  // Rate limiting
  'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
  
  // Generic fallback
  'default': 'An unexpected error occurred. Please try again later.'
} as const;

/**
 * Determines if an error message contains sensitive information
 */
function isSensitiveError(error: Error): boolean {
  const sensitivePatterns = [
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
    /edge function/i
  ];
  
  const errorMessage = error.message.toLowerCase();
  return sensitivePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * Extracts a generic error message from an error
 */
function getGenericErrorMessage(error: Error): string {
  const errorMessage = error.message;
  
  // Check for exact matches first
  for (const [key, genericMessage] of Object.entries(ERROR_MESSAGES)) {
    if (key !== 'default' && errorMessage.includes(key)) {
      return genericMessage;
    }
  }
  
  // Check for sensitive patterns and return generic message
  if (isSensitiveError(error)) {
    return ERROR_MESSAGES.default;
  }
  
  // For non-sensitive errors, return the original message (but sanitized)
  return errorMessage.length > 100 ? ERROR_MESSAGES.default : errorMessage;
}

/**
 * Logs detailed error information for administrators
 */
function logDetailedError(error: Error, context: ErrorContext): void {
  const logData = {
    timestamp: new Date().toISOString(),
    functionName: context.functionName,
    errorType: error.constructor.name,
    errorMessage: error.message,
    stack: error.stack,
    userId: context.userId,
    requestId: context.requestId,
    additionalData: context.additionalData
  };
  
  // Log to console (in production, this would go to a proper logging service)
  console.error('🔒 SECURE ERROR LOG:', JSON.stringify(logData, null, 2));
  
  // In a real application, you would also:
  // - Send to logging service (e.g., Sentry, LogRocket, etc.)
  // - Store in database for admin review
  // - Send alerts for critical errors
}

/**
 * Creates a secure error response
 */
export function createSecureErrorResponse(
  error: Error,
  context: ErrorContext,
  corsHeaders: Record<string, string> = {},
  statusCode: number = 500
): SecureErrorResponse {
  // Log detailed error for administrators
  logDetailedError(error, context);
  
  // Return generic message to client
  const genericMessage = getGenericErrorMessage(error);
  
  return {
    error: genericMessage,
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Wraps a function with secure error handling
 */
export function withSecureErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext,
  corsHeaders: Record<string, string> = {}
) {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      const secureResponse = createSecureErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        context,
        corsHeaders
      );
      
      return new Response(
        JSON.stringify({ error: secureResponse.error }),
        {
          status: secureResponse.status,
          headers: secureResponse.headers
        }
      );
    }
  };
}

/**
 * Validates and sanitizes error messages for client display
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove any potential sensitive information
  let sanitized = message
    .replace(/at \w+ \(.*?\)/g, '') // Remove stack trace locations
    .replace(/line \d+/gi, '') // Remove line numbers
    .replace(/\.ts:\d+/gi, '') // Remove TypeScript file references
    .replace(/\.js:\d+/gi, '') // Remove JavaScript file references
    .replace(/node_modules\/.*?\/.*?/g, '') // Remove node_modules paths
    .replace(/supabase.*?\.co/gi, '[REDACTED]') // Remove Supabase URLs
    .replace(/stripe.*?\.com/gi, '[REDACTED]') // Remove Stripe URLs
    .replace(/resend.*?\.com/gi, '[REDACTED]') // Remove Resend URLs
    .trim();
  
  // Limit message length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized || ERROR_MESSAGES.default;
}
