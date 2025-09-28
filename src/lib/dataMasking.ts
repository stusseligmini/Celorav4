/**
 * Data masking and encryption utilities
 * 
 * Provides functions for masking sensitive data in logs and UI,
 * as well as encryption/decryption utilities.
 */

/**
 * Mask a credit card number, showing only the last 4 digits
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) return '';
  
  // Remove any non-digit characters
  const digits = cardNumber.replace(/\D/g, '');
  
  // Check if we have enough digits to mask
  if (digits.length < 4) return '****';
  
  // Show only the last 4 digits
  return '•'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask an email address, showing only first character and domain
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****';
  
  const [localPart, domain] = email.split('@');
  
  // Keep first character of local part and add asterisks
  const maskedLocal = localPart.charAt(0) + '•'.repeat(Math.max(localPart.length - 1, 2));
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a phone number, showing only the last 4 digits
 */
export function maskPhone(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Check if we have enough digits to mask
  if (digits.length < 4) return '****';
  
  // Show only the last 4 digits
  return '•'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask a name, showing only first character of first and last name
 */
export function maskName(name: string): string {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  
  if (parts.length === 1) {
    // Only one name part (first name only)
    const firstName = parts[0];
    return firstName.charAt(0) + '•'.repeat(Math.max(firstName.length - 1, 2));
  } else {
    // Multiple name parts (assume first and last name)
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    
    return `${firstName.charAt(0)}${'•'.repeat(Math.max(firstName.length - 1, 2))} ${lastName.charAt(0)}${'•'.repeat(Math.max(lastName.length - 1, 2))}`;
  }
}

/**
 * Mask any PII (Personally Identifiable Information) in a text
 * This is useful for logs or error messages
 */
export function maskPII(text: string): string {
  if (!text) return '';
  
  // Define patterns for common PII
  const patterns = [
    // Credit card numbers (with or without spaces/dashes)
    { pattern: /(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/g, replace: (m: string) => maskCreditCard(m) },
    
    // Social Security Numbers (123-45-6789 format)
    { pattern: /\b(\d{3}-\d{2}-\d{4})\b/g, replace: () => '***-**-****' },
    
    // Email addresses
    { pattern: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, replace: (m: string) => maskEmail(m) },
    
    // Phone numbers in various formats
    { pattern: /\b(\+?\d{1,3}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/g, replace: (m: string) => maskPhone(m) },
    
    // IP addresses
    { pattern: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, replace: () => '*.*.*.*.* (redacted IP)' },
    
    // JWT tokens
    { pattern: /(eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,})\.[A-Za-z0-9_-]+/g, replace: (m: string) => {
      const parts = m.split('.');
      return `${parts[0].substring(0, 10)}...${parts[1].substring(0, 10)}...redacted`;
    }},
    
    // API keys and access tokens (assumed to be long alphanumeric strings with special chars)
    { pattern: /\b([A-Za-z0-9+/]{30,}=*)\b/g, replace: (m: string) => `${m.substring(0, 6)}...${m.substring(m.length - 4)} (redacted key)` }
  ];
  
  // Apply each pattern
  let result = text;
  patterns.forEach(({ pattern, replace }) => {
    result = result.replace(pattern, replace);
  });
  
  return result;
}

/**
 * Mask sensitive data in an object (for logging)
 */
export function maskSensitiveData(obj: any, sensitiveKeys: string[] = [
  'password', 'token', 'secret', 'key', 'credential', 'accessToken', 'refreshToken',
  'cardNumber', 'cvv', 'ssn', 'socialSecurity', 'dob', 'birthdate', 'address'
]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, sensitiveKeys));
  }
  
  // Handle objects
  const maskedObj: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this key matches any of the sensitive keys
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
    
    if (isSensitive) {
      // Mask the sensitive value based on key type
      if (key.toLowerCase().includes('email')) {
        maskedObj[key] = typeof value === 'string' ? maskEmail(value) : '[REDACTED]';
      } else if (key.toLowerCase().includes('phone')) {
        maskedObj[key] = typeof value === 'string' ? maskPhone(value) : '[REDACTED]';
      } else if (key.toLowerCase().includes('card')) {
        maskedObj[key] = typeof value === 'string' ? maskCreditCard(value) : '[REDACTED]';
      } else if (key.toLowerCase().includes('name')) {
        maskedObj[key] = typeof value === 'string' ? maskName(value) : '[REDACTED]';
      } else {
        // Generic redaction for other sensitive fields
        maskedObj[key] = '[REDACTED]';
      }
    } else if (value && typeof value === 'object') {
      // Recursively mask nested objects
      maskedObj[key] = maskSensitiveData(value, sensitiveKeys);
    } else {
      // Copy non-sensitive value as is
      maskedObj[key] = value;
    }
  }
  
  return maskedObj;
}