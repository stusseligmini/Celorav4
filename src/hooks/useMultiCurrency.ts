'use client';

import { useState, useEffect, useCallback } from 'react';
import { multiCurrency, Currency, CurrencyConversion, CurrencyPreferences } from '@/lib/multiCurrency';

interface UseMultiCurrencyReturn {
  currencies: Currency[];
  exchangeRates: Record<string, Record<string, number | null>>;
  userPreferences: CurrencyPreferences | null;
  convertCurrency: (amount: number, from: string, to: string, includeFee?: boolean) => Promise<CurrencyConversion | null>;
  formatCurrency: (amount: number, currency: string, locale?: string) => string;
  updatePreferences: (preferences: Partial<CurrencyPreferences>) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useMultiCurrency(userId?: string): UseMultiCurrencyReturn {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, Record<string, number | null>>>({});
  const [userPreferences, setUserPreferences] = useState<CurrencyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize multi-currency system
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize the multi-currency manager
        await multiCurrency.initialize();

        // Get supported currencies
        const supportedCurrencies = multiCurrency.getSupportedCurrencies();
        setCurrencies(supportedCurrencies);

        // Build exchange rate matrix
        const rates: Record<string, Record<string, number | null>> = {};
        supportedCurrencies.forEach(fromCurrency => {
          rates[fromCurrency.code] = {};
          supportedCurrencies.forEach(toCurrency => {
            if (fromCurrency.code === toCurrency.code) {
              rates[fromCurrency.code][toCurrency.code] = 1;
            } else {
              rates[fromCurrency.code][toCurrency.code] = multiCurrency.getExchangeRate(
                fromCurrency.code,
                toCurrency.code
              );
            }
          });
        });
        setExchangeRates(rates);

      } catch (err) {
        console.error('Failed to initialize multi-currency:', err);
        setError('Failed to load currency data');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Load user preferences when userId is available
  useEffect(() => {
    const loadPreferences = async () => {
      if (!userId) return;

      try {
        const preferences = await multiCurrency.getUserPreferences(userId);
        setUserPreferences(preferences);
      } catch (err) {
        console.error('Failed to load user preferences:', err);
        setError('Failed to load user preferences');
      }
    };

    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  // Convert currency function
  const convertCurrency = useCallback(async (
    amount: number,
    from: string,
    to: string,
    includeFee: boolean = false
  ): Promise<CurrencyConversion | null> => {
    try {
      return await multiCurrency.convertCurrency(amount, from, to, includeFee);
    } catch (err) {
      console.error('Currency conversion failed:', err);
      setError('Currency conversion failed');
      return null;
    }
  }, []);

  // Format currency function
  const formatCurrency = useCallback((
    amount: number,
    currency: string,
    locale?: string
  ): string => {
    try {
      return multiCurrency.formatCurrency(amount, currency, locale);
    } catch (err) {
      console.error('Currency formatting failed:', err);
      return `${amount} ${currency}`;
    }
  }, []);

  // Update preferences function
  const updatePreferences = useCallback(async (
    preferences: Partial<CurrencyPreferences>
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await multiCurrency.updateUserPreferences(userId, preferences);
      if (success) {
        // Reload preferences
        const updatedPreferences = await multiCurrency.getUserPreferences(userId);
        setUserPreferences(updatedPreferences);
      }
      return success;
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setError('Failed to update preferences');
      return false;
    }
  }, [userId]);

  return {
    currencies,
    exchangeRates,
    userPreferences,
    convertCurrency,
    formatCurrency,
    updatePreferences,
    loading,
    error
  };
}

// Hook for getting currency information
export function useCurrency(currencyCode?: string) {
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      if (!currencyCode) {
        setCurrency(null);
        setLoading(false);
        return;
      }

      try {
        await multiCurrency.initialize();
        const currencyInfo = multiCurrency.getCurrency(currencyCode);
        setCurrency(currencyInfo);
      } catch (err) {
        console.error('Failed to load currency:', err);
        setCurrency(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, [currencyCode]);

  return { currency, loading };
}

// Hook for currency conversion with caching
export function useCurrencyConverter() {
  const [conversionCache, setConversionCache] = useState<Map<string, CurrencyConversion>>(new Map());
  const [loading, setLoading] = useState(false);

  const convert = useCallback(async (
    amount: number,
    from: string,
    to: string,
    includeFee: boolean = false,
    useCache: boolean = true
  ): Promise<CurrencyConversion | null> => {
    // Check cache first
    const cacheKey = `${amount}-${from}-${to}-${includeFee}`;
    if (useCache && conversionCache.has(cacheKey)) {
      const cached = conversionCache.get(cacheKey)!;
      // Use cached result if it's less than 5 minutes old
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes
        return cached;
      }
    }

    setLoading(true);
    try {
      await multiCurrency.initialize();
      const result = await multiCurrency.convertCurrency(amount, from, to, includeFee);
      
      if (result && useCache) {
        // Update cache
        setConversionCache(prev => new Map(prev.set(cacheKey, result)));
        
        // Clean old cache entries
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        setConversionCache(prev => {
          const cleaned = new Map();
          prev.forEach((value, key) => {
            const age = Date.now() - new Date(value.timestamp).getTime();
            if (age < fiveMinutesAgo) {
              cleaned.set(key, value);
            }
          });
          return cleaned;
        });
      }
      
      return result;
    } catch (err) {
      console.error('Currency conversion failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversionCache]);

  const clearCache = useCallback(() => {
    setConversionCache(new Map());
  }, []);

  return {
    convert,
    clearCache,
    loading,
    cacheSize: conversionCache.size
  };
}