/**
 * Development configuration utilities
 * Handles development mode settings and feature flags
 */

export interface DevelopmentConfig {
  isDevMode: boolean;
  frictionlessPayments: boolean;
  mockPayments: boolean;
  skipEmailNotifications: boolean;
  enableDebugLogging: boolean;
}

/**
 * Get development configuration from environment variables
 */
export function getDevelopmentConfig(): DevelopmentConfig {
  // Check if we're in development mode
  const isDevMode = 
    typeof window !== 'undefined' 
      ? (window as any).__ENV__?.VITE_DEV_MODE === 'true' || 
        import.meta.env?.VITE_DEV_MODE === 'true' ||
        import.meta.env?.MODE === 'development'
      : process.env.NODE_ENV === 'development';

  // Check for frictionless payments flag
  const frictionlessPayments = 
    typeof window !== 'undefined'
      ? (window as any).__ENV__?.VITE_FRICTIONLESS_PAYMENTS === 'true' ||
        import.meta.env?.VITE_FRICTIONLESS_PAYMENTS === 'true'
      : process.env.VITE_FRICTIONLESS_PAYMENTS === 'true';

  return {
    isDevMode,
    frictionlessPayments: isDevMode && frictionlessPayments,
    mockPayments: isDevMode && frictionlessPayments,
    skipEmailNotifications: isDevMode,
    enableDebugLogging: isDevMode,
  };
}

/**
 * Check if frictionless payments are enabled
 */
export function isFrictionlessPaymentsEnabled(): boolean {
  return getDevelopmentConfig().frictionlessPayments;
}

/**
 * Check if we should skip email notifications
 */
export function shouldSkipEmailNotifications(): boolean {
  return getDevelopmentConfig().skipEmailNotifications;
}

/**
 * Check if debug logging is enabled
 */
export function isDebugLoggingEnabled(): boolean {
  return getDevelopmentConfig().enableDebugLogging;
}

/**
 * Log development mode information
 */
export function logDevelopmentInfo(): void {
  const config = getDevelopmentConfig();
  
  if (config.isDevMode) {
    console.log('🔧 Development Mode Configuration:', {
      isDevMode: config.isDevMode,
      frictionlessPayments: config.frictionlessPayments,
      mockPayments: config.mockPayments,
      skipEmailNotifications: config.skipEmailNotifications,
      enableDebugLogging: config.enableDebugLogging,
    });
  }
}
