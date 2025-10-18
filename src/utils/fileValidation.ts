/**
 * Secure file validation utilities
 * Provides content-based file validation to prevent malicious file uploads
 */

// File signature bytes for common image formats
const IMAGE_SIGNATURES = {
  // JPEG
  jpeg: [
    [0xFF, 0xD8, 0xFF], // JPEG/JFIF
  ],
  // PNG
  png: [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  // GIF
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP
  webp: [
    [0x52, 0x49, 0x46, 0x46], // RIFF (first 4 bytes, followed by file size, then WEBP)
  ],
  // BMP
  bmp: [
    [0x42, 0x4D], // BM
  ],
  // ICO
  ico: [
    [0x00, 0x00, 0x01, 0x00], // ICO
  ],
  // TIFF
  tiff: [
    [0x49, 0x49, 0x2A, 0x00], // TIFF little endian
    [0x4D, 0x4D, 0x00, 0x2A], // TIFF big endian
  ],
  // SVG (vector format - no binary signature, but we can check for XML declaration)
  svg: [
    // SVG files start with XML declaration or <svg tag
    // We'll handle this specially in the validation
  ],
};

// Dangerous file patterns that might indicate malicious content
const MALICIOUS_PATTERNS = [
  // Script tags
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  // PHP tags
  /<\?php/gi,
  /<\?=/gi,
  // ASP tags
  /<%[\s\S]*?%>/gi,
  // JavaScript execution patterns
  /javascript:/gi,
  /vbscript:/gi,
  // Data URLs with script content
  /data:.*script/gi,
  // Common executable extensions embedded as strings
  /\.exe[\s"']/gi,
  /\.bat[\s"']/gi,
  /\.cmd[\s"']/gi,
  /\.com[\s"']/gi,
  /\.scr[\s"']/gi,
  /\.pif[\s"']/gi,
  // Suspicious HTML event handlers
  /on\w+\s*=/gi,
];

// Common executable file extensions that should never be allowed
const EXECUTABLE_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.msi', '.deb', '.dmg',
  '.pkg', '.app', '.jar', '.war', '.ear', '.sh', '.ps1', '.vbs', '.js',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi',
];

/**
 * Read the first few bytes of a file to check its signature
 */
async function readFileSignature(file: File, bytesToRead: number = 16): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array.slice(0, bytesToRead));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => reject(new Error('File read error'));
    
    // Read only the first chunk of bytes
    const blob = file.slice(0, bytesToRead);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check if file signature matches any known image format
 */
function matchesImageSignature(signature: Uint8Array): { isValid: boolean; format?: string } {
  for (const [format, signatures] of Object.entries(IMAGE_SIGNATURES)) {
    for (const expectedSignature of signatures) {
      if (format === 'webp') {
        // Special handling for WebP: check RIFF header + WEBP identifier
        if (signature.length >= 12 &&
            signature[0] === 0x52 && signature[1] === 0x49 && 
            signature[2] === 0x46 && signature[3] === 0x46 &&
            signature[8] === 0x57 && signature[9] === 0x45 &&
            signature[10] === 0x42 && signature[11] === 0x50) {
          return { isValid: true, format };
        }
      } else if (format === 'svg') {
        // Special handling for SVG: check for XML declaration or <svg tag
        const text = new TextDecoder('utf-8', { fatal: false }).decode(signature);
        if (text.includes('<?xml') || text.includes('<svg')) {
          return { isValid: true, format };
        }
      } else {
        // Standard signature matching
        const matches = expectedSignature.every((byte, index) => 
          index < signature.length && signature[index] === byte
        );
        if (matches) {
          return { isValid: true, format };
        }
      }
    }
  }
  
  return { isValid: false };
}

/**
 * Read file content as text to scan for malicious patterns
 */
async function readFileAsText(file: File, maxBytes: number = 8192): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => reject(new Error('File read error'));
    
    // Read only the first chunk of the file as text
    const blob = file.slice(0, maxBytes);
    reader.readAsText(blob);
  });
}

/**
 * Check for malicious patterns in file content
 */
function containsMaliciousPatterns(content: string): { isMalicious: boolean; patterns: string[] } {
  const foundPatterns: string[] = [];
  
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      foundPatterns.push(pattern.source);
    }
  }
  
  return {
    isMalicious: foundPatterns.length > 0,
    patterns: foundPatterns
  };
}

/**
 * Check if filename has executable extension
 */
function hasExecutableExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return EXECUTABLE_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Comprehensive file validation for image uploads
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  format?: string;
  warnings?: string[];
}

export async function validateImageFile(file: File): Promise<FileValidationResult> {
  const warnings: string[] = [];
  
  try {
    // 1. Basic checks
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }
    
    // 2. File size check (increased to 25MB for better partner experience)
    if (file.size > 25 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 25MB' };
    }
    
    // 3. Check for executable extensions
    if (hasExecutableExtension(file.name)) {
      return { isValid: false, error: 'File type not allowed' };
    }
    
    // 4. MIME type validation (relaxed - allow more image types)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      // Fallback: if MIME type is not recognized but file has image extension, allow it
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|svg)$/i;
      if (!imageExtensions.test(file.name)) {
        return { isValid: false, error: 'File must be an image (JPEG, PNG, GIF, WebP, BMP, TIFF, or SVG)' };
      }
    }
    
    // 5. Content-based validation: Check file signature (relaxed - warn instead of reject)
    const signature = await readFileSignature(file, 16);
    const signatureCheck = matchesImageSignature(signature);
    
    if (!signatureCheck.isValid) {
      // Instead of rejecting, add a warning and allow upload
      warnings.push('File signature validation failed - proceeding with upload but please verify the image displays correctly');
    }
    
    // 6. Scan for malicious patterns in file content (relaxed - only check for obvious threats)
    try {
      const fileContent = await readFileAsText(file, 8192);
      const maliciousCheck = containsMaliciousPatterns(fileContent);
      
      if (maliciousCheck.isMalicious) {
        // Only reject if it contains obvious executable code, not just HTML tags
        const criticalPatterns = ['<script', '<?php', 'javascript:', 'vbscript:'];
        const hasCriticalThreat = criticalPatterns.some(pattern => 
          fileContent.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (hasCriticalThreat) {
          return {
            isValid: false,
            error: 'File contains potentially malicious code'
          };
        } else {
          warnings.push('File contains some HTML-like content - please verify it\'s a valid image');
        }
      }
    } catch (textReadError) {
      // If we can't read as text, it's likely binary (which is good for images)
      // This is expected for most image files
      warnings.push('File appears to be binary (expected for images)');
    }
    
    // 7. Additional filename sanitization
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        isValid: false,
        error: 'Invalid filename. Filenames cannot contain path traversal characters.'
      };
    }
    
    // 8. Check for suspicious filename patterns (relaxed)
    const dangerousChars = /[<>:"|?*\x00-\x1f]/g; // eslint-disable-line no-control-regex
    if (dangerousChars.test(file.name)) {
      return {
        isValid: false,
        error: 'Filename contains dangerous characters that could cause security issues'
      };
    }
    
    // Allow more characters but warn about unusual ones
    const unusualChars = /[!@#$%^&()+=\[\]{};',~`]/g;
    if (unusualChars.test(file.name)) {
      warnings.push('Filename contains unusual characters - consider using simpler names');
    }
    
    return {
      isValid: true,
      format: signatureCheck.format,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate a safe filename for uploaded images
 */
export function generateSafeFilename(originalName: string, prefix: string = ''): string {
  // Extract extension - support more formats
  const extension = originalName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|ico|tiff|tif|svg)$/)?.[1] || 'jpg';
  
  // Generate timestamp and random component
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  // Create safe filename
  const safeFilename = `${prefix}${timestamp}-${random}.${extension}`;
  
  return safeFilename;
}