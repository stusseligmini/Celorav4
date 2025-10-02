import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge and conditionally apply Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for proper Tailwind class merging
 * @param inputs - class values to merge
 * @returns merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas as thousands separators
 * @param num - number to format
 * @param decimals - number of decimal places
 * @returns formatted number string
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a monetary value with currency symbol
 * @param amount - amount to format
 * @param currency - currency code (USD, EUR, etc.)
 * @param locale - locale to use for formatting
 * @returns formatted currency string
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency ${currency}:`, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Truncate a string if it's longer than the specified length
 * @param str - string to truncate
 * @param length - maximum length
 * @param ending - string to append at the end
 * @returns truncated string
 */
export function truncate(str: string, length: number = 30, ending: string = '...'): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length - ending.length) + ending;
}

/**
 * Delay execution for specified milliseconds
 * @param ms - milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if string is a valid URL
 * @param string - string to check
 * @returns boolean indicating if string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a date to a human-readable string
 * @param date - date to format
 * @param format - format style ('short', 'medium', 'long', 'full')
 * @param locale - locale to use for formatting
 * @returns formatted date string
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: format,
    };
    
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateObj.toDateString();
  }
}

/**
 * Format a date/time to a human-readable string
 * @param date - date to format
 * @param format - format style ('short', 'medium', 'long', 'full')
 * @param locale - locale to use for formatting
 * @returns formatted date/time string
 */
export function formatDateTime(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: format,
      timeStyle: format,
    };
    
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return dateObj.toLocaleString();
  }
}

/**
 * Calculate time elapsed since a given date
 * @param date - date to calculate elapsed time from
 * @returns string representing elapsed time
 */
export function timeAgo(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return `${interval} years ago`;
  if (interval === 1) return '1 year ago';
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return `${interval} months ago`;
  if (interval === 1) return '1 month ago';
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return `${interval} days ago`;
  if (interval === 1) return '1 day ago';
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return `${interval} hours ago`;
  if (interval === 1) return '1 hour ago';
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return `${interval} minutes ago`;
  if (interval === 1) return '1 minute ago';
  
  if (seconds < 10) return 'just now';
  return `${Math.floor(seconds)} seconds ago`;
}

/**
 * Generate a random string of specified length
 * @param length - length of the string to generate
 * @returns random string
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
