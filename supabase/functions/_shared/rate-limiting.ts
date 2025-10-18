/**
 * Shared Rate Limiting Utility for Supabase Edge Functions
 * 
 * This module provides comprehensive rate limiting functionality to protect
 * against DoS attacks, API abuse, and brute force attacks.
 */

// Rate limiting storage - using Map for in-memory storage
// In production, consider using Redis or database for persistent storage
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked: boolean }>();

// Rate limiting configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Public endpoints (maps, contact forms)
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    blockDurationMs: 300000, // 5 minutes block
  },
  
  // Authentication endpoints (login, register, password reset)
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    blockDurationMs: 1800000, // 30 minutes block
  },
  
  // Payment endpoints (high value operations)
  payment: {
    windowMs: 300000, // 5 minutes
    maxRequests: 3, // 3 attempts per 5 minutes
    blockDurationMs: 1800000, // 30 minutes block
  },
  
  // Booking endpoints (moderate frequency)
  booking: {
    windowMs: 300000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes
    blockDurationMs: 900000, // 15 minutes block
  },
  
  // Admin endpoints (low frequency, high security)
  admin: {
    windowMs: 60000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    blockDurationMs: 600000, // 10 minutes block
  },
  
  // Email endpoints (prevent spam)
  email: {
    windowMs: 3600000, // 1 hour
    maxRequests: 5, // 5 emails per hour
    blockDurationMs: 3600000, // 1 hour block
  }
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Get client IP address from request headers
 */
export function getClientIP(req: Request): string {
  // Check various headers for client IP (in order of preference)
  const headers = [
    'cf-connecting-ip',     // Cloudflare
    'x-forwarded-for',      // Standard proxy header
    'x-real-ip',           // Nginx
    'x-client-ip',         // Apache
    'x-cluster-client-ip', // Cluster
    'x-forwarded',         // General
    'forwarded-for',       // General
    'forwarded'            // General
  ];
  
  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }
  
  return 'unknown';
}

/**
 * Get user identifier for rate limiting
 * Combines IP address with user ID if available
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Create a more specific key by combining IP, user ID, and user agent hash
  const userAgentHash = userAgent.length > 0 ? 
    userAgent.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString() : '0';
  
  if (userId) {
    return `${clientIP}:${userId}:${userAgentHash}`;
  }
  
  return `${clientIP}:${userAgentHash}`;
}

/**
 * Check if request is within rate limits
 */
export function checkRateLimit(
  key: string, 
  type: RateLimitType,
  req: Request
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const config = RATE_LIMIT_CONFIGS[type];
  const now = Date.now();
  
  // Get current rate limit data
  const current = rateLimitStore.get(key);
  
  // If no data exists or window has expired, create new entry
  if (!current || now > current.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }
  
  // Check if currently blocked
  if (current.blocked) {
    const blockExpired = now > (current.resetTime + config.blockDurationMs);
    if (blockExpired) {
      // Unblock and reset
      const newEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      };
      rateLimitStore.set(key, newEntry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    } else {
      // Still blocked
      const retryAfter = Math.ceil((current.resetTime + config.blockDurationMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter
      };
    }
  }
  
  // Check if limit exceeded
  if (current.count >= config.maxRequests) {
    // Block the user
    current.blocked = true;
    current.resetTime = now + config.blockDurationMs;
    rateLimitStore.set(key, current);
    
    const retryAfter = Math.ceil(config.blockDurationMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfter
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime
  };
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  allowed: boolean,
  remaining: number,
  resetTime: number,
  retryAfter?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '10', // This would be dynamic based on config
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  };
  
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }
  
  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
  retryAfter?: number,
  corsHeaders: Record<string, string> = {}
): Response {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...(retryAfter && { 'Retry-After': retryAfter.toString() })
  };
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: retryAfter || 60
    }),
    {
      status: 429,
      headers
    }
  );
}

/**
 * Rate limiting middleware for edge functions
 */
export function withRateLimit(
  type: RateLimitType,
  corsHeaders: Record<string, string> = {},
  getUserId?: (req: Request) => Promise<string | undefined>
) {
  return async (req: Request, handler: (req: Request) => Promise<Response>): Promise<Response> => {
    try {
      // Get user ID if function is provided
      const userId = getUserId ? await getUserId(req) : undefined;
      
      // Get rate limit key
      const key = getRateLimitKey(req, userId);
      
      // Check rate limit
      const rateLimitResult = checkRateLimit(key, type, req);
      
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult.retryAfter, corsHeaders);
      }
      
      // Add rate limit headers to response
      const rateLimitHeaders = createRateLimitHeaders(
        rateLimitResult.allowed,
        rateLimitResult.remaining,
        rateLimitResult.resetTime,
        rateLimitResult.retryAfter
      );
      
      // Execute the handler
      const response = await handler(req);
      
      // Add rate limit headers to the response
      const newHeaders = new Headers(response.headers);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If rate limiting fails, allow the request to proceed
      // This prevents rate limiting from breaking the application
      return handler(req);
    }
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove entries that are both expired and not blocked
    if (now > data.resetTime && !data.blocked) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => rateLimitStore.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
  }
}

/**
 * Get rate limit statistics (for monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedEntries: number;
  activeEntries: number;
} {
  const now = Date.now();
  let blockedEntries = 0;
  let activeEntries = 0;
  
  for (const data of rateLimitStore.values()) {
    if (data.blocked) {
      blockedEntries++;
    } else if (now <= data.resetTime) {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    blockedEntries,
    activeEntries
  };
}
