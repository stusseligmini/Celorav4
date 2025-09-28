/**
 * Secure File Handling Utilities
 * 
 * This module provides utilities for secure file upload, download, and validation
 * to prevent security issues like file path traversal and malicious uploads.
 */

import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { logSecurity } from './logger';
import { sanitizeUrl } from './xssProtection';

// Safe file extensions that are allowed to be uploaded
const SAFE_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  // Documents
  'pdf', 'docx', 'xlsx', 'pptx',
  // Plain text
  'txt', 'csv', 'md', 'json',
]);

// Maximum file size in bytes (default: 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME type validation map
const VALID_MIME_TYPES: Record<string, string[]> = {
  // Images
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  'svg': ['image/svg+xml'],
  
  // Documents
  'pdf': ['application/pdf'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  
  // Plain text
  'txt': ['text/plain'],
  'csv': ['text/csv'],
  'md': ['text/markdown', 'text/plain'],
  'json': ['application/json'],
};

/**
 * Interface for validated file metadata
 */
export interface ValidatedFile {
  filename: string;
  originalFilename: string;
  sanitizedFilename: string;
  contentType: string;
  extension: string;
  size: number;
  hash: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Validates a file for security issues
 */
export async function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedExtensions?: string[];
    validateMimeType?: boolean;
  } = {}
): Promise<ValidatedFile> {
  const {
    maxSize = MAX_FILE_SIZE,
    allowedExtensions = Array.from(SAFE_EXTENSIONS),
    validateMimeType = true,
  } = options;
  
  const validationErrors: string[] = [];
  
  // Get file extension
  const originalFilename = file.name;
  const filenameParts = originalFilename.split('.');
  const extension = filenameParts.length > 1 
    ? filenameParts.pop()!.toLowerCase() 
    : '';
  
  // Sanitize the filename
  const sanitizedFilename = sanitizeFilename(originalFilename);
  
  // Create a secure random filename
  const secureFilename = `${randomBytes(16).toString('hex')}.${extension}`;
  
  // Calculate file hash for integrity validation
  const hash = await calculateFileHash(file);
  
  // Validation checks
  
  // 1. Check file size
  if (file.size > maxSize) {
    validationErrors.push(`File size exceeds the maximum allowed size of ${maxSize} bytes`);
  }
  
  // 2. Check file extension
  if (!allowedExtensions.includes(extension)) {
    validationErrors.push(`File extension "${extension}" is not allowed`);
  }
  
  // 3. Validate content type against extension
  if (validateMimeType && extension) {
    const expectedMimeTypes = VALID_MIME_TYPES[extension] || [];
    
    if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
      validationErrors.push(
        `File content type "${file.type}" doesn't match expected type for .${extension} file`
      );
    }
  }
  
  return {
    filename: secureFilename,
    originalFilename,
    sanitizedFilename,
    contentType: file.type,
    extension,
    size: file.size,
    hash,
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Sanitizes a filename to prevent path traversal and command injection
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path traversal characters
    .replace(/\.\.\//g, '')
    .replace(/\\/g, '')
    .replace(/\//g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potentially dangerous characters
    .replace(/[;&|`$]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Ensure the filename isn't too long
    .substring(0, 255);
}

/**
 * Validates the safety of a file download URL
 */
export function validateDownloadUrl(url: string): { isValid: boolean; error?: string } {
  // Sanitize the URL first
  const sanitized = sanitizeUrl(url);
  
  // Check if sanitization changed the URL (indicating potential issues)
  if (sanitized !== url) {
    return { 
      isValid: false,
      error: 'URL contains potentially unsafe characters or format'
    };
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow specific protocols
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return {
        isValid: false,
        error: 'URL protocol must be HTTP or HTTPS'
      };
    }
    
    // Validate hostname - only allow specific domains
    const allowedDomains = [
      'storage.googleapis.com',
      'cdn.celora.app',
      'celora-files.s3.amazonaws.com',
      // Add your domains here
    ];
    
    if (!allowedDomains.some(domain => parsedUrl.hostname === domain || 
                                      parsedUrl.hostname.endsWith(`.${domain}`))) {
      return {
        isValid: false,
        error: 'URL domain is not on the allowed list'
      };
    }
    
    // Validate path for traversal attempts
    if (parsedUrl.pathname.includes('..') || parsedUrl.pathname.includes('//')) {
      return {
        isValid: false,
        error: 'URL path contains path traversal sequences'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Calculates a SHA-256 hash of a file for integrity verification
 */
async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // Use crypto subtle for browser environments
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } else {
          // Fallback for Node.js environments
          const buffer = Buffer.from(arrayBuffer);
          const hash = createHash('sha256').update(buffer).digest('hex');
          resolve(hash);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    
    // Read the file as an array buffer for hashing
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Adds security-related headers to download responses
 */
export function addSecureDownloadHeaders(headers: Headers, filename: string, contentType: string): Headers {
  // Set Content-Disposition to attachment to force download
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  
  // Set appropriate content type
  headers.set('Content-Type', contentType);
  
  // Prevent browsers from MIME-sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Disable caching for sensitive files
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  return headers;
}