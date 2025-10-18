/**
 * Strong password validation utilities
 * Enforces security best practices for password strength
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
  };
  score: number; // 0-5 strength score
  feedback: string[];
}

// Strong password requirements
const PASSWORD_CONFIG = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};

// Common weak passwords to reject
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '12345678', 'qwerty123', 'admin123',
  'welcome123', 'letmein123', 'password1', 'abc123456', '123456789',
  'qwerty', 'admin', 'user', 'guest', 'test', 'demo', '11111111',
  '00000000', 'aaaaaaaa', 'password!', 'Password1', 'Welcome1!',
];

// Suspicious patterns that indicate weak passwords
const WEAK_PATTERNS = [
  /^(.)\1{7,}$/, // Repeated characters (aaaaaaaa)
  /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
  /^(qwe|asd|zxc)/i, // Keyboard patterns
];

/**
 * Comprehensive password validation with security best practices
 */
export function validatePassword(password: string): PasswordValidationResult {
  const feedback: string[] = [];
  let score = 0;
  
  // Check minimum length
  const hasMinLength = password.length >= PASSWORD_CONFIG.minLength;
  if (!hasMinLength) {
    feedback.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters long`);
  } else {
    score += 1;
  }
  
  // Check for uppercase letters
  const hasUppercase = /[A-Z]/.test(password);
  if (!hasUppercase && PASSWORD_CONFIG.requireUppercase) {
    feedback.push('Password must contain at least one uppercase letter (A-Z)');
  } else if (hasUppercase) {
    score += 1;
  }
  
  // Check for lowercase letters
  const hasLowercase = /[a-z]/.test(password);
  if (!hasLowercase && PASSWORD_CONFIG.requireLowercase) {
    feedback.push('Password must contain at least one lowercase letter (a-z)');
  } else if (hasLowercase) {
    score += 1;
  }
  
  // Check for numbers
  const hasNumbers = /\d/.test(password);
  if (!hasNumbers && PASSWORD_CONFIG.requireNumbers) {
    feedback.push('Password must contain at least one number (0-9)');
  } else if (hasNumbers) {
    score += 1;
  }
  
  // Check for symbols
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  if (!hasSymbols && PASSWORD_CONFIG.requireSymbols) {
    feedback.push('Password must contain at least one special character (!@#$%^&* etc.)');
  } else if (hasSymbols) {
    score += 1;
  }
  
  // Check for common weak passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.includes(lowerPassword)) {
    feedback.push('This is a commonly used password. Please choose a more unique password.');
    score = Math.max(0, score - 2);
  }
  
  // Check for weak patterns
  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      feedback.push('Password contains predictable patterns. Please use a more random combination.');
      score = Math.max(0, score - 1);
      break;
    }
  }
  
  // Bonus points for length
  if (password.length >= 12) {
    score += 1;
  }
  
  // Check if all requirements are met
  const isValid = hasMinLength && 
                 (!PASSWORD_CONFIG.requireUppercase || hasUppercase) &&
                 (!PASSWORD_CONFIG.requireLowercase || hasLowercase) &&
                 (!PASSWORD_CONFIG.requireNumbers || hasNumbers) &&
                 (!PASSWORD_CONFIG.requireSymbols || hasSymbols) &&
                 feedback.length === 0;
  
  return {
    isValid,
    errors: {
      length: !hasMinLength,
      uppercase: !hasUppercase,
      lowercase: !hasLowercase,
      numbers: !hasNumbers,
      symbols: !hasSymbols,
    },
    score: Math.min(5, score),
    feedback,
  };
}

/**
 * Get password strength description based on score
 */
export function getPasswordStrength(score: number): {
  label: string;
  color: string;
  description: string;
} {
  switch (score) {
    case 0:
    case 1:
      return {
        label: 'Very Weak',
        color: 'text-red-600',
        description: 'This password is easily guessable'
      };
    case 2:
      return {
        label: 'Weak',
        color: 'text-orange-600',
        description: 'This password could be stronger'
      };
    case 3:
      return {
        label: 'Fair',
        color: 'text-yellow-600',
        description: 'This password is acceptable but could be improved'
      };
    case 4:
      return {
        label: 'Good',
        color: 'text-blue-600',
        description: 'This is a good password'
      };
    case 5:
      return {
        label: 'Strong',
        color: 'text-green-600',
        description: 'This is a very strong password'
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-600',
        description: 'Unable to determine password strength'
      };
  }
}

/**
 * Simple password validation for backward compatibility
 * Returns true if password meets minimum security requirements
 */
export function isPasswordStrong(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * Generate password validation error message for display to users
 * Returns the most specific requirement that's missing
 */
export function getPasswordValidationMessage(password: string): string {
  const validation = validatePassword(password);
  
  if (validation.isValid) {
    return 'Password meets all security requirements';
  }
  
  // Return specific missing requirements in order of priority
  if (validation.errors.length) {
    return `Password must be at least ${PASSWORD_CONFIG.minLength} characters long`;
  }
  
  if (validation.errors.uppercase) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  
  if (validation.errors.lowercase) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  
  if (validation.errors.numbers) {
    return 'Password must contain at least one number (0-9)';
  }
  
  if (validation.errors.symbols) {
    return 'Password must contain at least one special character (!@#$%^&*)';
  }
  
  // Check for specific feedback about weak patterns or common passwords
  if (validation.feedback.length > 0) {
    return validation.feedback[0];
  }
  
  return 'Password does not meet security requirements';
}

/**
 * Get all missing requirements as a formatted list for detailed feedback
 */
export function getMissingRequirements(password: string): string[] {
  const validation = validatePassword(password);
  const missing: string[] = [];
  
  if (validation.errors.length) {
    missing.push(`At least ${PASSWORD_CONFIG.minLength} characters long`);
  }
  
  if (validation.errors.uppercase) {
    missing.push('One uppercase letter (A-Z)');
  }
  
  if (validation.errors.lowercase) {
    missing.push('One lowercase letter (a-z)');
  }
  
  if (validation.errors.numbers) {
    missing.push('One number (0-9)');
  }
  
  if (validation.errors.symbols) {
    missing.push('One special character (!@#$%^&*)');
  }
  
  return missing;
}

/**
 * Get a user-friendly summary of what's missing
 */
export function getPasswordRequirementsSummary(password: string): string {
  const missing = getMissingRequirements(password);
  
  if (missing.length === 0) {
    return 'Password meets all requirements';
  }
  
  if (missing.length === 1) {
    return `Missing: ${missing[0]}`;
  }
  
  if (missing.length === 2) {
    return `Missing: ${missing.join(' and ')}`;
  }
  
  return `Missing: ${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`;
}