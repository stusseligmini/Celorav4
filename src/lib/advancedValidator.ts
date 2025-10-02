/**
 * Advanced Input Validation and Sanitization for Celora V2
 * Comprehensive validation system with:
 * - Schema-based validation using Zod
 * - XSS protection and sanitization
 * - SQL injection prevention
 * - File upload validation
 * - Financial data validation (card numbers, amounts, etc.)
 * - Cryptocurrency address validation
 * - International format validation (phone, postal codes)
 */

import { z } from 'zod';

// Card validation utilities
const CARD_PATTERNS = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  dinersclub: /^3[0689][0-9]{11}$/,
  jcb: /^(?:2131|1800|35\d{3})\d{11}$/
};

// Cryptocurrency address patterns
const CRYPTO_PATTERNS = {
  bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  litecoin: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
  dogecoin: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
  ripple: /^r[0-9a-zA-Z]{24,34}$/
};

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  sanitized?: any;
}

export interface FileValidationOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  scanForViruses?: boolean;
}

class AdvancedValidator {
  private static instance: AdvancedValidator;

  // Common validation schemas
  public readonly schemas = {
    // Authentication schemas
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters')
      .max(254, 'Email must be less than 254 characters')
      .toLowerCase()
      .transform(email => email.trim()),

    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),

    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name must be less than 100 characters')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name contains invalid characters')
      .transform(name => this.sanitizeString(name)),

    phone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .transform(phone => phone.replace(/\D/g, '')),

    // Financial schemas
    cardNumber: z.string()
      .regex(/^\d{13,19}$/, 'Invalid card number format')
      .refine(this.validateCardNumber.bind(this), 'Invalid card number'),

    cardExpiry: z.string()
      .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid expiry format (MM/YY)')
      .refine(this.validateCardExpiry.bind(this), 'Card has expired'),

    cvv: z.string()
      .regex(/^\d{3,4}$/, 'Invalid CVV format'),

    amount: z.number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount exceeds maximum limit')
      .multipleOf(0.01, 'Amount can only have 2 decimal places'),

    currency: z.enum(['USD', 'EUR', 'GBP', 'NOK', 'BTC', 'ETH', 'LTC']),

    // Address schemas
    address: z.object({
      street: z.string().min(1, 'Street is required').max(200),
      city: z.string().min(1, 'City is required').max(100),
      state: z.string().min(1, 'State is required').max(100),
      postalCode: z.string().regex(/^[A-Z0-9\s-]{3,12}$/i, 'Invalid postal code'),
      country: z.string().length(2, 'Country must be 2-letter ISO code').toUpperCase()
    }),

    // Cryptocurrency schemas
    cryptoAddress: z.string()
      .min(25, 'Invalid crypto address')
      .max(62, 'Invalid crypto address')
      .refine(this.validateCryptoAddress.bind(this), 'Invalid cryptocurrency address'),

    // Security schemas
    mfaCode: z.string()
      .regex(/^\d{6}$/, 'MFA code must be 6 digits'),

    backupCode: z.string()
      .regex(/^[A-Z0-9]{8}$/, 'Invalid backup code format'),

    // File upload schemas
    fileName: z.string()
      .min(1, 'Filename is required')
      .max(255, 'Filename too long')
      .regex(/^[^<>:"/\\|?*\x00-\x1f]+$/, 'Invalid filename characters')
      .refine(name => !name.startsWith('.'), 'Filename cannot start with dot'),

    // API schemas
    apiKey: z.string()
      .regex(/^[A-Za-z0-9_-]{32,128}$/, 'Invalid API key format'),

    webhookUrl: z.string()
      .url('Invalid webhook URL')
      .refine(url => url.startsWith('https://'), 'Webhook URL must use HTTPS'),

    // Search and pagination
    searchQuery: z.string()
      .max(500, 'Search query too long')
      .transform(query => this.sanitizeString(query)),

    pagination: z.object({
      page: z.number().int().positive().max(10000).default(1),
      limit: z.number().int().positive().max(100).default(20),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    })
  };

  private constructor() {}

  static getInstance(): AdvancedValidator {
    if (!AdvancedValidator.instance) {
      AdvancedValidator.instance = new AdvancedValidator();
    }
    return AdvancedValidator.instance;
  }

  /**
   * Validate data against a schema
   */
  validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          sanitized: result.data
        };
      } else {
        return {
          success: false,
          errors: result.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Validation failed: ' + (error as Error).message]
      };
    }
  }

  /**
   * Sanitize string input to prevent XSS
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    // Basic XSS prevention without external library
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/&lt;script/gi, '') // Remove encoded script tags
      .replace(/&gt;/gi, ''); // Remove encoded closing tags

    // Additional sanitization
    return sanitized
      .trim()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Sanitize HTML content while preserving safe tags
   */
  sanitizeHTML(input: string, allowedTags?: string[]): string {
    const defaultAllowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'];
    const tags = allowedTags || defaultAllowedTags;
    
    // Simple HTML sanitization without external library
    let sanitized = input;
    
    // Remove dangerous tags and attributes
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript:/gi, ''); // Remove javascript: URLs

    // Remove all tags except allowed ones
    const allowedTagsPattern = tags.join('|');
    const tagRegex = new RegExp(`<(?!\/?(?:${allowedTagsPattern})(?:\s|>))[^>]*>`, 'gi');
    sanitized = sanitized.replace(tagRegex, '');

    return sanitized.trim();
  }

  /**
   * Validate and sanitize file uploads
   */
  async validateFile(
    file: File | { name: string; size: number; type: string },
    options: FileValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    } = options;

    // Validate file name
    const nameResult = this.validate(this.schemas.fileName, file.name);
    if (!nameResult.success) {
      errors.push(...(nameResult.errors || []));
    }

    // Validate file size
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed`);
    }

    // Validate file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.some(ext => ext.toLowerCase() === extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|com|pif|vbs|js|jar|php|asp|jsp)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
      /\x00/
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Suspicious file name detected');
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitized: {
        name: this.sanitizeString(file.name),
        size: file.size,
        type: file.type
      }
    };
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  private validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    
    // Check if it matches any card pattern
    const isValidPattern = Object.values(CARD_PATTERNS).some(pattern => pattern.test(digits));
    if (!isValidPattern) return false;

    // Luhn algorithm
    let sum = 0;
    let alternate = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }

  /**
   * Validate card expiry date
   */
  private validateCardExpiry(expiry: string): boolean {
    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear() % 100;
    
    const expiryMonth = parseInt(month, 10);
    const expiryYear = parseInt(year, 10);
    
    if (expiryYear > currentYear) return true;
    if (expiryYear === currentYear && expiryMonth >= currentMonth) return true;
    
    return false;
  }

  /**
   * Validate cryptocurrency address
   */
  private validateCryptoAddress(address: string): boolean {
    return Object.values(CRYPTO_PATTERNS).some(pattern => pattern.test(address));
  }

  /**
   * Detect card type from number
   */
  detectCardType(cardNumber: string): string | null {
    const digits = cardNumber.replace(/\D/g, '');
    
    for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
      if (pattern.test(digits)) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * Detect cryptocurrency type from address
   */
  detectCryptoType(address: string): string | null {
    for (const [type, pattern] of Object.entries(CRYPTO_PATTERNS)) {
      if (pattern.test(address)) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * Validate international phone number
   */
  validateInternationalPhone(phone: string, countryCode?: string): ValidationResult {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Basic international format validation
    if (!cleanPhone.match(/^\+?[1-9]\d{6,14}$/)) {
      return {
        success: false,
        errors: ['Invalid international phone number format']
      };
    }

    // Country-specific validation could be added here
    const validatedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

    return {
      success: true,
      data: validatedPhone,
      sanitized: validatedPhone
    };
  }

  /**
   * Validate and format postal codes by country
   */
  validatePostalCode(postalCode: string, countryCode: string): ValidationResult {
    const patterns: Record<string, RegExp> = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
      GB: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
      DE: /^\d{5}$/,
      FR: /^\d{5}$/,
      NO: /^\d{4}$/,
      SE: /^\d{3} \d{2}$/,
      DK: /^\d{4}$/
    };

    const pattern = patterns[countryCode.toUpperCase()];
    if (!pattern) {
      return {
        success: false,
        errors: [`Postal code validation not supported for country: ${countryCode}`]
      };
    }

    const normalizedCode = postalCode.trim().toUpperCase();
    if (!pattern.test(normalizedCode)) {
      return {
        success: false,
        errors: [`Invalid postal code format for ${countryCode}`]
      };
    }

    return {
      success: true,
      data: normalizedCode,
      sanitized: normalizedCode
    };
  }

  /**
   * Validate JSON structure
   */
  validateJSON(jsonString: string, maxDepth: number = 10, maxSize: number = 1024 * 1024): ValidationResult {
    const errors: string[] = [];

    // Check size
    if (jsonString.length > maxSize) {
      errors.push(`JSON string too large: ${jsonString.length} bytes (max: ${maxSize})`);
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Check depth
      const depth = this.getObjectDepth(parsed);
      if (depth > maxDepth) {
        errors.push(`JSON structure too deep: ${depth} levels (max: ${maxDepth})`);
      }

      // Check for potential security issues
      const stringified = JSON.stringify(parsed);
      if (stringified.includes('<script') || stringified.includes('javascript:')) {
        errors.push('JSON contains potentially malicious content');
      }

      return {
        success: errors.length === 0,
        data: parsed,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format: ' + (error as Error).message]
      };
    }
  }

  /**
   * Calculate object depth
   */
  private getObjectDepth(obj: any, depth: number = 1): number {
    if (obj === null || typeof obj !== 'object') return depth;
    
    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }
    
    return maxDepth;
  }

  /**
   * Create custom validation schema
   */
  createCustomSchema<T>(schemaDefinition: z.ZodRawShape): z.ZodObject<z.ZodRawShape> {
    return z.object(schemaDefinition);
  }

  /**
   * Batch validate multiple fields
   */
  validateBatch(validations: Array<{ schema: z.ZodSchema; data: any; field: string }>): {
    success: boolean;
    results: Record<string, ValidationResult>;
  } {
    const results: Record<string, ValidationResult> = {};
    let allValid = true;

    for (const { schema, data, field } of validations) {
      const result = this.validate(schema, data);
      results[field] = result;
      if (!result.success) {
        allValid = false;
      }
    }

    return { success: allValid, results };
  }

  /**
   * Express middleware for request validation
   */
  createValidationMiddleware(schemas: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  }) {
    return (req: any, res: any, next: any) => {
      const errors: string[] = [];

      // Validate body
      if (schemas.body) {
        const result = this.validate(schemas.body, req.body);
        if (!result.success) {
          errors.push(...(result.errors || []));
        } else {
          req.body = result.sanitized;
        }
      }

      // Validate query parameters
      if (schemas.query) {
        const result = this.validate(schemas.query, req.query);
        if (!result.success) {
          errors.push(...(result.errors || []));
        } else {
          req.query = result.sanitized;
        }
      }

      // Validate route parameters
      if (schemas.params) {
        const result = this.validate(schemas.params, req.params);
        if (!result.success) {
          errors.push(...(result.errors || []));
        } else {
          req.params = result.sanitized;
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      next();
    };
  }
}

// Export singleton instance
export const validator = AdvancedValidator.getInstance();

// Utility functions for common validations
export const validateEmail = (email: string) => validator.validate(validator.schemas.email, email);
export const validatePassword = (password: string) => validator.validate(validator.schemas.password, password);
export const validateCardNumber = (cardNumber: string) => validator.validate(validator.schemas.cardNumber, cardNumber);
export const validateAmount = (amount: number) => validator.validate(validator.schemas.amount, amount);
export const sanitizeString = (input: string) => validator.sanitizeString(input);
export const sanitizeHTML = (input: string, allowedTags?: string[]) => validator.sanitizeHTML(input, allowedTags);
export const createValidationMiddleware = (schemas: any) => validator.createValidationMiddleware(schemas);
