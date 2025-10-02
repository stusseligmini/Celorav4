/**
 * Multi-Currency Support System for Celora V2
 * 
 * Provides comprehensive multi-currency functionality including:
 * - Real-time exchange rates
 * - Currency conversion
 * - Multi-currency wallet support  
 * - Transaction currency handling
 * - Regional currency preferences
 * - Cryptocurrency support
 */

import { getSupabaseClient } from './supabaseSingleton';
import { featureFlags } from './featureFlags';

export interface Currency {
  code: string; // ISO 4217 code (USD, EUR, etc.) or crypto symbol (BTC, ETH, etc.)
  name: string;
  symbol: string;
  decimals: number;
  type: 'fiat' | 'crypto';
  isActive: boolean;
  country?: string;
  region?: string;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
  source: string; // 'binance', 'coinbase', 'forex', etc.
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface CurrencyConversion {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  fee: number;
  timestamp: string;
}

export interface CurrencyPreferences {
  userId: string;
  primaryCurrency: string;
  displayCurrencies: string[];
  autoConvert: boolean;
  preferredExchange: string;
  roundingRules: {
    [currency: string]: {
      method: 'round' | 'floor' | 'ceil';
      decimals: number;
    };
  };
}

class MultiCurrencyManager {
  private static instance: MultiCurrencyManager;
  private currencies: Map<string, Currency> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private userPreferences: Map<string, CurrencyPreferences> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): MultiCurrencyManager {
    if (!MultiCurrencyManager.instance) {
      MultiCurrencyManager.instance = new MultiCurrencyManager();
    }
    return MultiCurrencyManager.instance;
  }

  /**
   * Initialize the multi-currency system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if multi-currency is enabled
      await featureFlags.initialize();
      const isEnabled = featureFlags.isEnabled('multi_currency', { defaultValue: true });
      
      if (!isEnabled) {
        console.log('Multi-currency support is disabled');
        return;
      }

      // Load supported currencies
      await this.loadCurrencies();
      
      // Load exchange rates
      await this.loadExchangeRates();
      
      // Start rate update interval (every 5 minutes)
      this.startRateUpdates();
      
      this.initialized = true;
      console.log('Multi-currency system initialized');
    } catch (error) {
      console.error('Failed to initialize multi-currency system:', error);
      throw error;
    }
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return Array.from(this.currencies.values()).filter(c => c.isActive);
  }

  /**
   * Get currency information
   */
  getCurrency(code: string): Currency | null {
    return this.currencies.get(code.toUpperCase()) || null;
  }

  /**
   * Get current exchange rate between two currencies
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): number | null {
    const key = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const reverseKey = `${toCurrency.toUpperCase()}_${fromCurrency.toUpperCase()}`;
    
    const rate = this.exchangeRates.get(key);
    if (rate) {
      return rate.rate;
    }
    
    // Try reverse rate
    const reverseRate = this.exchangeRates.get(reverseKey);
    if (reverseRate && reverseRate.rate > 0) {
      return 1 / reverseRate.rate;
    }
    
    return null;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    includeFee: boolean = false
  ): Promise<CurrencyConversion | null> {
    try {
      // Same currency, no conversion needed
      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return {
          fromAmount: amount,
          fromCurrency: fromCurrency.toUpperCase(),
          toAmount: amount,
          toCurrency: toCurrency.toUpperCase(),
          rate: 1,
          fee: 0,
          timestamp: new Date().toISOString()
        };
      }

      const rate = this.getExchangeRate(fromCurrency, toCurrency);
      if (!rate) {
        console.error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
        return null;
      }

      let convertedAmount = amount * rate;
      let fee = 0;

      // Calculate conversion fee if applicable
      if (includeFee) {
        const feeRate = await this.getConversionFeeRate(fromCurrency, toCurrency);
        fee = convertedAmount * feeRate;
        convertedAmount = convertedAmount - fee;
      }

      return {
        fromAmount: amount,
        fromCurrency: fromCurrency.toUpperCase(),
        toAmount: convertedAmount,
        toCurrency: toCurrency.toUpperCase(),
        rate,
        fee,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Currency conversion error:', error);
      return null;
    }
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(
    amount: number,
    currency: string,
    locale: string = 'en-US',
    options: Partial<Intl.NumberFormatOptions> = {}
  ): string {
    const currencyInfo = this.getCurrency(currency);
    
    if (!currencyInfo) {
      return `${amount} ${currency}`;
    }

    // For cryptocurrencies, use custom formatting
    if (currencyInfo.type === 'crypto') {
      return this.formatCryptoCurrency(amount, currency, currencyInfo.decimals);
    }

    // For fiat currencies, use Intl.NumberFormat
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: Math.min(currencyInfo.decimals, 2),
        maximumFractionDigits: currencyInfo.decimals,
        ...options
      });
      
      return formatter.format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currencyInfo.symbol}${amount.toFixed(currencyInfo.decimals)}`;
    }
  }

  /**
   * Get user currency preferences
   */
  async getUserPreferences(userId: string): Promise<CurrencyPreferences | null> {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId)!;
      }

      // Fetch from database
      const { data, error } = await getSupabaseClient()
        .from('currency_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return defaults
          return this.createDefaultPreferences(userId);
        }
        throw error;
      }

      const preferences: CurrencyPreferences = {
        userId,
        primaryCurrency: data.primary_currency,
        displayCurrencies: data.display_currencies,
        autoConvert: data.auto_convert,
        preferredExchange: data.preferred_exchange,
        roundingRules: data.rounding_rules || {}
      };

      this.userPreferences.set(userId, preferences);
      return preferences;
    } catch (error) {
      console.error('Error getting user currency preferences:', error);
      return null;
    }
  }

  /**
   * Update user currency preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<CurrencyPreferences>
  ): Promise<boolean> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      if (!currentPrefs) return false;

      const updatedPrefs = { ...currentPrefs, ...preferences };

      const { error } = await getSupabaseClient()
        .from('currency_preferences')
        .upsert({
          user_id: userId,
          primary_currency: updatedPrefs.primaryCurrency,
          display_currencies: updatedPrefs.displayCurrencies,
          auto_convert: updatedPrefs.autoConvert,
          preferred_exchange: updatedPrefs.preferredExchange,
          rounding_rules: updatedPrefs.roundingRules,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update cache
      this.userPreferences.set(userId, updatedPrefs);
      return true;
    } catch (error) {
      console.error('Error updating user currency preferences:', error);
      return false;
    }
  }

  /**
   * Get conversion fee rate between currencies
   */
  private async getConversionFeeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // Default fee rates - could be made configurable
    const cryptoToFiat = 0.015; // 1.5%
    const fiatToCrypto = 0.015; // 1.5%
    const cryptoToCrypto = 0.01; // 1%
    const fiatToFiat = 0.005; // 0.5%

    const fromCurrencyInfo = this.getCurrency(fromCurrency);
    const toCurrencyInfo = this.getCurrency(toCurrency);

    if (!fromCurrencyInfo || !toCurrencyInfo) {
      return 0.02; // 2% default
    }

    if (fromCurrencyInfo.type === 'crypto' && toCurrencyInfo.type === 'fiat') {
      return cryptoToFiat;
    }
    
    if (fromCurrencyInfo.type === 'fiat' && toCurrencyInfo.type === 'crypto') {
      return fiatToCrypto;
    }
    
    if (fromCurrencyInfo.type === 'crypto' && toCurrencyInfo.type === 'crypto') {
      return cryptoToCrypto;
    }
    
    return fiatToFiat;
  }

  /**
   * Format cryptocurrency amounts
   */
  private formatCryptoCurrency(amount: number, currency: string, decimals: number): string {
    const currencyInfo = this.getCurrency(currency);
    const symbol = currencyInfo?.symbol || currency;
    
    // For very small amounts, use scientific notation
    if (amount > 0 && amount < 0.00001) {
      return `${amount.toExponential(4)} ${symbol}`;
    }
    
    // For normal amounts, use fixed decimal places
    return `${amount.toFixed(Math.min(decimals, 8))} ${symbol}`;
  }

  /**
   * Load supported currencies from database
   */
  private async loadCurrencies(): Promise<void> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('supported_currencies')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      this.currencies.clear();
      if (data) {
        data.forEach((currency: any) => {
          this.currencies.set(currency.code, {
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimals: currency.decimals,
            type: currency.type,
            isActive: currency.is_active,
            country: currency.country,
            region: currency.region
          });
        });
      }

      // Add default currencies if none exist
      if (this.currencies.size === 0) {
        this.addDefaultCurrencies();
      }

      console.log(`Loaded ${this.currencies.size} currencies`);
    } catch (error) {
      console.error('Error loading currencies:', error);
      // Add default currencies as fallback
      this.addDefaultCurrencies();
    }
  }

  /**
   * Load exchange rates from database
   */
  private async loadExchangeRates(): Promise<void> {
    try {
      // Only load rates updated in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await getSupabaseClient()
        .from('exchange_rates')
        .select('*')
        .gte('updated_at', oneHourAgo)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      this.exchangeRates.clear();
      if (data) {
        data.forEach((rate: any) => {
          const key = `${rate.base_currency}_${rate.target_currency}`;
          this.exchangeRates.set(key, {
            id: rate.id,
            baseCurrency: rate.base_currency,
            targetCurrency: rate.target_currency,
            rate: rate.rate,
            timestamp: rate.updated_at,
            source: rate.source,
            bid: rate.bid,
            ask: rate.ask,
            spread: rate.spread
          });
        });
      }

      console.log(`Loaded ${this.exchangeRates.size} exchange rates`);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  }

  /**
   * Add default currencies
   */
  private addDefaultCurrencies(): void {
    const defaultCurrencies: Currency[] = [
      // Major Fiat Currencies
      { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, type: 'fiat', isActive: true, country: 'US', region: 'Americas' },
      { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, type: 'fiat', isActive: true, region: 'Europe' },
      { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, type: 'fiat', isActive: true, country: 'GB', region: 'Europe' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, type: 'fiat', isActive: true, country: 'JP', region: 'Asia' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, type: 'fiat', isActive: true, country: 'CA', region: 'Americas' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, type: 'fiat', isActive: true, country: 'AU', region: 'Oceania' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimals: 2, type: 'fiat', isActive: true, country: 'CH', region: 'Europe' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, type: 'fiat', isActive: true, country: 'CN', region: 'Asia' },
      
      // Major Cryptocurrencies
      { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8, type: 'crypto', isActive: true },
      { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18, type: 'crypto', isActive: true },
      { code: 'USDC', name: 'USD Coin', symbol: 'USDC', decimals: 6, type: 'crypto', isActive: true },
      { code: 'USDT', name: 'Tether', symbol: 'USDT', decimals: 6, type: 'crypto', isActive: true },
      { code: 'BNB', name: 'Binance Coin', symbol: 'BNB', decimals: 18, type: 'crypto', isActive: true },
      { code: 'ADA', name: 'Cardano', symbol: 'ADA', decimals: 6, type: 'crypto', isActive: true },
      { code: 'SOL', name: 'Solana', symbol: 'SOL', decimals: 9, type: 'crypto', isActive: true },
      { code: 'MATIC', name: 'Polygon', symbol: 'MATIC', decimals: 18, type: 'crypto', isActive: true }
    ];

    defaultCurrencies.forEach(currency => {
      this.currencies.set(currency.code, currency);
    });
  }

  /**
   * Create default user preferences
   */
  private async createDefaultPreferences(userId: string): Promise<CurrencyPreferences> {
    const defaults: CurrencyPreferences = {
      userId,
      primaryCurrency: 'USD',
      displayCurrencies: ['USD', 'EUR', 'BTC', 'ETH'],
      autoConvert: false,
      preferredExchange: 'binance',
      roundingRules: {
        'USD': { method: 'round', decimals: 2 },
        'EUR': { method: 'round', decimals: 2 },
        'BTC': { method: 'round', decimals: 8 },
        'ETH': { method: 'round', decimals: 6 }
      }
    };

    try {
      await getSupabaseClient()
        .from('currency_preferences')
        .insert({
          user_id: userId,
          primary_currency: defaults.primaryCurrency,
          display_currencies: defaults.displayCurrencies,
          auto_convert: defaults.autoConvert,
          preferred_exchange: defaults.preferredExchange,
          rounding_rules: defaults.roundingRules,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating default currency preferences:', error);
    }

    this.userPreferences.set(userId, defaults);
    return defaults;
  }

  /**
   * Start exchange rate updates
   */
  private startRateUpdates(): void {
    // Update rates every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateExchangeRates();
    }, 5 * 60 * 1000);
    
    // Initial update
    this.updateExchangeRates();
  }

  /**
   * Update exchange rates from external sources
   */
  private async updateExchangeRates(): Promise<void> {
    try {
      const rateUpdateEnabled = featureFlags.isEnabled('exchange_rate_updates', { defaultValue: true });
      if (!rateUpdateEnabled) {
        console.log('Exchange rate updates disabled by feature flag');
        return;
      }

      // This would typically fetch from external APIs like CoinGecko, Binance, etc.
      // For now, we'll just reload from database
      await this.loadExchangeRates();
    } catch (error) {
      console.error('Error updating exchange rates:', error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const multiCurrency = MultiCurrencyManager.getInstance();
