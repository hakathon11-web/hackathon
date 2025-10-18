/**
 * Production-Ready Logging Utility
 * 
 * This utility provides environment-aware logging that:
 * - Only logs errors and warnings in production
 * - Provides full logging in development
 * - Automatically sanitizes sensitive data
 * - Uses appropriate log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  sanitizeData: boolean;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = {
      level: this.isDevelopment ? 'debug' : 'error',
      enableConsole: true,
      sanitizeData: true
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private sanitizeData(data: any): any {
    if (!this.config.sanitizeData) return data;
    
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      // Check for sensitive patterns
      const sensitivePatterns = [
        /token/i, /key/i, /secret/i, /password/i, /auth/i,
        /session/i, /jwt/i, /bearer/i, /email/i, /phone/i,
        /address/i, /ssn/i, /credit.*card/i, /card.*number/i,
        /cvv/i, /cvc/i, /api.*key/i, /access.*key/i,
        /private.*key/i, /client.*secret/i, /user.*id/i,
        /customer.*id/i, /payment.*id/i, /booking.*id/i
      ];
      
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(data));
      return isSensitive ? '[SENSITIVE_DATA_REDACTED]' : data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sensitivePatterns = [
          /token/i, /key/i, /secret/i, /password/i, /auth/i,
          /session/i, /jwt/i, /bearer/i, /email/i, /phone/i,
          /address/i, /ssn/i, /credit.*card/i, /card.*number/i,
          /cvv/i, /cvc/i, /api.*key/i, /access.*key/i,
          /private.*key/i, /client.*secret/i, /user.*id/i,
          /customer.*id/i, /payment.*id/i, /booking.*id/i
        ];
        
        const isSensitiveKey = sensitivePatterns.some(pattern => pattern.test(key));
        if (isSensitiveKey) {
          sanitized[key] = '[SENSITIVE_DATA_REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map(arg => this.sanitizeData(arg));
    
    if (sanitizedArgs.length === 0) {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(sanitizedArgs)}`;
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug') || !this.config.enableConsole) return;
    console.debug(this.formatMessage('debug', message, ...args));
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info') || !this.config.enableConsole) return;
    console.info(this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn') || !this.config.enableConsole) return;
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error') || !this.config.enableConsole) return;
    console.error(this.formatMessage('error', message, ...args));
  }

  // Convenience methods for common use cases
  auth(message: string, ...args: any[]): void {
    this.debug(`[AUTH] ${message}`, ...args);
  }

  api(message: string, ...args: any[]): void {
    this.debug(`[API] ${message}`, ...args);
  }

  db(message: string, ...args: any[]): void {
    this.debug(`[DB] ${message}`, ...args);
  }

  security(message: string, ...args: any[]): void {
    this.warn(`[SECURITY] ${message}`, ...args);
  }

  performance(message: string, ...args: any[]): void {
    this.info(`[PERF] ${message}`, ...args);
  }

  // Method to update configuration
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Method to get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export the class for custom instances if needed
export { Logger };

// Export convenience functions for backward compatibility
export const log = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);

export default logger;
