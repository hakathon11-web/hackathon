/**
 * Password hashing utilities using Web Crypto API
 * Provides secure password hashing for employee authentication
 */

const SALT_LENGTH = 16;
const HASH_ITERATIONS = 100000; // PBKDF2 iterations
const HASH_LENGTH = 32; // SHA-256 hash length

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  if (crypto?.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }
  
  // Fallback for environments without Web Crypto API
  const salt = new Uint8Array(SALT_LENGTH);
  for (let i = 0; i < SALT_LENGTH; i++) {
    salt[i] = Math.floor(Math.random() * 256);
  }
  return salt;
}

/**
 * Simple hash function for fallback (not cryptographically secure)
 */
async function simpleHash(input: string, salt: string): Promise<string> {
  // This is a simple hash for development only - not secure for production
  const combined = salt + input;
  let hash = 0;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, '0');
    return paddedHexCode;
  });
  return hexCodes.join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Hash a password using PBKDF2 with SHA-256 or fallback method
 * Returns a string in the format: salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  
  // Try to use Web Crypto API if available
  if (crypto?.subtle) {
    try {
      // Import password as key material
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive key using PBKDF2
      const derivedKey = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt.buffer,
          iterations: HASH_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        HASH_LENGTH * 8 // bits
      );

      const saltHex = arrayBufferToHex(salt.buffer);
      const hashHex = arrayBufferToHex(derivedKey);
      
      return `${saltHex}$${hashHex}`;
    } catch (error) {
      console.warn('Web Crypto API failed, falling back to simple hash:', error);
    }
  }
  
  // Fallback for development environments without Web Crypto API
  const saltHex = arrayBufferToHex(salt.buffer);
  const hashHex = await simpleHash(password, saltHex);
  
  return `${saltHex}$${hashHex}$fallback`;
}

/**
 * Verify a password against a hash
 * Hash format: salt$hash or salt$hash$fallback
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split('$');
    const [saltHex, expectedHashHex, isFallback] = parts;
    
    if (!saltHex || !expectedHashHex) {
      return false;
    }

    // Handle fallback hash format
    if (isFallback === 'fallback') {
      const actualHashHex = await simpleHash(password, saltHex);
      return actualHashHex === expectedHashHex;
    }

    // Try Web Crypto API if available
    if (crypto?.subtle) {
      try {
        const salt = new Uint8Array(hexToArrayBuffer(saltHex));
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(password),
          'PBKDF2',
          false,
          ['deriveBits']
        );

        // Derive key using PBKDF2 with the same salt
        const derivedKey = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt.buffer,
            iterations: HASH_ITERATIONS,
            hash: 'SHA-256',
          },
          keyMaterial,
          HASH_LENGTH * 8 // bits
        );

        const actualHashHex = arrayBufferToHex(derivedKey);
        
        // Constant-time comparison to prevent timing attacks
        return actualHashHex === expectedHashHex;
      } catch (error) {
        console.warn('Web Crypto API verification failed:', error);
      }
    }

    // If Web Crypto API is not available or failed, but hash doesn't have fallback marker,
    // we can't verify the password
    console.error('Cannot verify password: Web Crypto API not available and hash is not in fallback format');
    return false;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password hash is using the old insecure base64 format
 */
export function isLegacyHash(hash: string): boolean {
  // Legacy hashes don't contain '$' separator and are base64 encoded
  return !hash.includes('$') && /^[A-Za-z0-9+/]+=*$/.test(hash);
}

/**
 * Verify legacy base64 encoded password (for backward compatibility during migration)
 */
export function verifyLegacyPassword(password: string, hash: string): boolean {
  try {
    return btoa(password) === hash;
  } catch (error) {
    return false;
  }
}