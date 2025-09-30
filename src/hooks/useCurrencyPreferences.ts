'use client';

import { useState, useEffect, useCallback } from 'react';
import { multiCurrency, CurrencyPreferences } from '@/lib/multiCurrency';
import { useMultiCurrency } from './useMultiCurrency';
import { useAuth } from './useAuth';

interface UseCurrencyPreferencesReturn {
  preferences: CurrencyPreferences | null;
  primaryCurrency: string;
  displayCurrencies: string[];
  isLoading: boolean;
  error: string | null;
  setPrimaryCurrency: (currency: string) => Promise<boolean>;
  updatePrimaryCurrency: (currency: string) => Promise<boolean>; // Alias for setPrimaryCurrency
  setDisplayCurrencies: (currencies: string[]) => Promise<boolean>;
  setAutoConvert: (autoConvert: boolean) => Promise<boolean>;
  setPreferredExchange: (exchange: string) => Promise<boolean>;
  updateRoundingRule: (currency: string, method: 'round' | 'floor' | 'ceil', decimals: number) => Promise<boolean>;
}

/**
 * Hook for managing user currency preferences
 */
export function useCurrencyPreferences(): UseCurrencyPreferencesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const { userPreferences, updatePreferences, loading, error } = useMultiCurrency(user?.id);
  const [primaryCurrency, setPrimaryCurrencyState] = useState<string>('USD');
  const [displayCurrencies, setDisplayCurrenciesState] = useState<string[]>(['USD', 'EUR', 'BTC', 'ETH']);

  // Update local state when preferences change
  useEffect(() => {
    if (userPreferences) {
      setPrimaryCurrencyState(userPreferences.primaryCurrency);
      setDisplayCurrenciesState(userPreferences.displayCurrencies);
    }
  }, [userPreferences]);

  // Set primary currency handler
  const setPrimaryCurrency = useCallback(async (currency: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await updatePreferences({
        primaryCurrency: currency
      });
      
      if (success) {
        setPrimaryCurrencyState(currency);
      }
      
      return success;
    } catch (err) {
      console.error('Failed to set primary currency:', err);
      return false;
    }
  }, [user, updatePreferences]);

  // Set display currencies handler
  const setDisplayCurrencies = useCallback(async (currencies: string[]): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await updatePreferences({
        displayCurrencies: currencies
      });
      
      if (success) {
        setDisplayCurrenciesState(currencies);
      }
      
      return success;
    } catch (err) {
      console.error('Failed to set display currencies:', err);
      return false;
    }
  }, [user, updatePreferences]);

  // Set auto convert handler
  const setAutoConvert = useCallback(async (autoConvert: boolean): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await updatePreferences({
        autoConvert
      });
    } catch (err) {
      console.error('Failed to set auto convert:', err);
      return false;
    }
  }, [user, updatePreferences]);

  // Set preferred exchange handler
  const setPreferredExchange = useCallback(async (exchange: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await updatePreferences({
        preferredExchange: exchange
      });
    } catch (err) {
      console.error('Failed to set preferred exchange:', err);
      return false;
    }
  }, [user, updatePreferences]);

  // Update rounding rule handler
  const updateRoundingRule = useCallback(async (
    currency: string, 
    method: 'round' | 'floor' | 'ceil', 
    decimals: number
  ): Promise<boolean> => {
    if (!user || !userPreferences) return false;
    
    try {
      const updatedRoundingRules = {
        ...userPreferences.roundingRules,
        [currency]: { method, decimals }
      };
      
      return await updatePreferences({
        roundingRules: updatedRoundingRules
      });
    } catch (err) {
      console.error('Failed to update rounding rule:', err);
      return false;
    }
  }, [user, userPreferences, updatePreferences]);

  return {
    preferences: userPreferences,
    primaryCurrency,
    displayCurrencies,
    isLoading: loading || authLoading,
    error,
    setPrimaryCurrency,
    updatePrimaryCurrency: setPrimaryCurrency, // Alias for setPrimaryCurrency
    setDisplayCurrencies,
    setAutoConvert,
    setPreferredExchange,
    updateRoundingRule
  };
}

/**
 * Hook for currency conversion functionality with added caching
 */
export function useCurrencyConversion() {
  const { convertCurrency } = useMultiCurrency();
  const { preferences } = useCurrencyPreferences();
  const [conversionCache, setConversionCache] = useState<Map<string, any>>(new Map());

  // Function to convert amounts between currencies with caching
  const convert = useCallback(async (
    amount: number,
    from: string,
    to?: string,
    includeFee: boolean = false,
    useCache: boolean = true
  ) => {
    // If no 'to' currency specified, use primary currency from preferences
    const toCurrency = to || preferences?.primaryCurrency || 'USD';
    
    // Check cache first if enabled
    if (useCache) {
      const cacheKey = `${amount}-${from}-${toCurrency}-${includeFee}`;
      const cached = conversionCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) { // 5 minute cache
        return cached.result;
      }
    }
    
    try {
      const result = await convertCurrency(amount, from, toCurrency, includeFee);
      
      // Update cache
      if (useCache && result) {
        const cacheKey = `${amount}-${from}-${toCurrency}-${includeFee}`;
        setConversionCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, {
            result,
            timestamp: Date.now()
          });
          return newCache;
        });
      }
      
      return result;
    } catch (err) {
      console.error('Currency conversion failed:', err);
      return null;
    }
  }, [convertCurrency, preferences, conversionCache]);

  // Clear the cache
  const clearCache = useCallback(() => {
    setConversionCache(new Map());
  }, []);

  return { convert, clearCache, cacheSize: conversionCache.size };
}