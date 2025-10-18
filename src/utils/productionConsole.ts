/**
 * Production Console Override
 * 
 * This utility disables most console logging in production while keeping
 * only critical error and security logging.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error
};

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
  // Disable most logging in production
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  
  // Keep warnings and errors for critical issues
  // console.warn and console.error remain unchanged
  
  // Optional: Override warn to be more selective
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Only log warnings that contain specific keywords
    const message = args.join(' ').toLowerCase();
    if (message.includes('critical') || 
        message.includes('security') || 
        message.includes('failed') ||
        message.includes('error')) {
      originalWarn(...args);
    }
  };
}

// Export for potential use in other files
export const productionConsole = {
  original: originalConsole,
  isProduction: process.env.NODE_ENV === 'production'
};

export default productionConsole;
