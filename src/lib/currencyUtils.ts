import { multiCurrency } from './multiCurrency';
import { getSupabaseClient } from './supabaseSingleton';
import { cache } from 'react';

/**
 * Server-side utility for currency conversions
 * This can be used in Server Components where hooks aren't available
 */

interface ConversionResult {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  fee: number;
}

/**
 * Convert currency amounts on the server side
 * Cached to improve performance for repeated conversions
 */
export const convertCurrency = cache(async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  includeFee: boolean = false
): Promise<ConversionResult | null> => {
  try {
    // Initialize multi-currency system if needed
    await multiCurrency.initialize();
    
    // Perform conversion
    return await multiCurrency.convertCurrency(
      amount, 
      fromCurrency, 
      toCurrency, 
      includeFee
    );
  } catch (error) {
    console.error('Server-side currency conversion error:', error);
    return null;
  }
});

/**
 * Format currency amount for display on the server side
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency ${currency}:`, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get user's primary currency preference
 */
export async function getUserPrimaryCurrency(userId: string): Promise<string> {
  if (!userId) return 'USD';
  
  try {
    const { data } = await getSupabaseClient()
      .from('currency_preferences')
      .select('primary_currency')
      .eq('user_id', userId)
      .single();
    
    return data?.primary_currency || 'USD';
  } catch (error) {
    console.error('Error getting user primary currency:', error);
    return 'USD';
  }
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    // Initialize multi-currency system if needed
    await multiCurrency.initialize();
    
    // Get rate
    return multiCurrency.getExchangeRate(fromCurrency, toCurrency);
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return null;
  }
}

/**
 * Get currency information
 */
export async function getCurrencyInfo(currencyCode: string) {
  try {
    // Initialize multi-currency system if needed
    await multiCurrency.initialize();
    
    // Get currency info
    return multiCurrency.getCurrency(currencyCode);
  } catch (error) {
    console.error(`Error getting currency info for ${currencyCode}:`, error);
    return null;
  }
}

/**
 * Get all supported currencies
 */
export async function getSupportedCurrencies(activeOnly: boolean = true) {
  try {
    // Initialize multi-currency system if needed
    await multiCurrency.initialize();
    
    // Get currencies
    const currencies = multiCurrency.getSupportedCurrencies();
    
    // Filter if needed
    return activeOnly ? currencies.filter(c => c.isActive) : currencies;
  } catch (error) {
    console.error('Error getting supported currencies:', error);
    return [];
  }
}