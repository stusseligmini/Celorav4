'use client';

import { z } from 'zod';

/**
 * Common validation schemas for form inputs and API payloads
 * 
 * This file provides reusable Zod validation schemas for consistent
 * validation across both client and server.
 */

// Email validation with detailed error messages
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long');

// Password validation with strength requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password is too long')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[^A-Za-z0-9]/.test(password),
    'Password must contain at least one special character'
  );

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(30, 'Username must be at most 30 characters long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  );

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(
    /^\+?[0-9]{10,15}$/,
    'Please enter a valid phone number (10-15 digits, optionally starting with +)'
  );

// URL validation
export const urlSchema = z
  .string()
  .url('Please enter a valid URL');

// Amount validation for financial transactions
export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be a valid number')
  .refine(
    (amount) => amount >= 0.01,
    'Amount must be at least 0.01'
  );

// Date validation (past date)
export const pastDateSchema = z
  .date()
  .refine(
    (date) => date < new Date(),
    'Date must be in the past'
  );

// Date validation (future date)
export const futureDateSchema = z
  .date()
  .refine(
    (date) => date > new Date(),
    'Date must be in the future'
  );

// Credit card number validation (using Luhn algorithm)
export const creditCardSchema = z
  .string()
  .refine(
    (cc) => {
      // Remove any non-digit characters
      const cardNumber = cc.replace(/\D/g, '');
      
      // Check if length is valid (most card types are 13-19 digits)
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        return false;
      }
      
      // Luhn algorithm validation
      let sum = 0;
      let shouldDouble = false;
      
      // Loop through values starting from the rightmost digit
      for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));
        
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      
      return sum % 10 === 0;
    },
    'Please enter a valid credit card number'
  );

// Common auth-related schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Common wallet/payment schemas
export const transferSchema = z.object({
  amount: amountSchema,
  recipientId: z.string().uuid('Please enter a valid recipient ID'),
  description: z.string().max(255, 'Description is too long').optional(),
});

export const cardCreateSchema = z.object({
  cardType: z.enum(['virtual', 'physical']),
  cardName: z.string().min(1, 'Card name is required').max(30, 'Card name is too long'),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  spendingLimit: z.number().positive('Spending limit must be positive').optional(),
});

/**
 * Validates an object against a schema and returns errors in a form-friendly format
 */
export function validateForm<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      
      return { success: false, errors };
    }
    
    // Fallback for non-Zod errors
    return { 
      success: false, 
      errors: { _form: 'Validation failed. Please check your input.' } 
    };
  }
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}