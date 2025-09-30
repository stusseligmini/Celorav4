'use client';

import React, { useState, useEffect } from 'react';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { Currency } from '@/lib/multiCurrency';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CurrencyConverter } from '@/components/CurrencyFormatter';

export default function CurrencyPreferencesPage() {
  const { preferences, primaryCurrency, displayCurrencies, setPrimaryCurrency, setDisplayCurrencies, setAutoConvert, setPreferredExchange, isLoading } = useCurrencyPreferences();
  const { currencies } = useMultiCurrency();
  
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [autoConvertEnabled, setAutoConvertEnabled] = useState(false);
  const [preferredExchange, setPreferredExchangeState] = useState('binance');
  
  // Initialize state from preferences
  useEffect(() => {
    if (preferences) {
      setSelectedCurrencies(preferences.displayCurrencies);
      setAutoConvertEnabled(preferences.autoConvert);
      setPreferredExchangeState(preferences.preferredExchange);
    }
  }, [preferences]);

  // Filter active currencies
  const activeCurrencies = currencies.filter(c => c.isActive);

  // Sort currencies - fiat first, then crypto, alphabetically within groups
  const sortedCurrencies = [...activeCurrencies].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'fiat' ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  });

  // Handle primary currency change
  const handlePrimaryCurrencyChange = async (currencyCode: string) => {
    await setPrimaryCurrency(currencyCode);
  };

  // Toggle currency in selected currencies list
  const toggleCurrency = (currencyCode: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(currencyCode)) {
        return prev.filter(code => code !== currencyCode);
      } else {
        return [...prev, currencyCode];
      }
    });
  };

  // Save display currencies
  const saveDisplayCurrencies = async () => {
    await setDisplayCurrencies(selectedCurrencies);
  };

  // Toggle auto convert
  const toggleAutoConvert = async () => {
    const newValue = !autoConvertEnabled;
    setAutoConvertEnabled(newValue);
    await setAutoConvert(newValue);
  };

  // Update preferred exchange
  const handleExchangeChange = async (exchange: string) => {
    setPreferredExchangeState(exchange);
    await setPreferredExchange(exchange);
  };

  if (isLoading) {
    return <div className="p-6 animate-pulse">Loading currency preferences...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Currency Preferences</h1>

      <div className="space-y-8">
        {/* Primary Currency Section */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Primary Currency</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select your primary currency. All amounts will default to this currency across the app.
          </p>
          
          <div className="max-w-md">
            <label htmlFor="primaryCurrency" className="block text-sm font-medium mb-2">
              Primary Currency
            </label>
            <select
              id="primaryCurrency"
              value={primaryCurrency}
              onChange={(e) => handlePrimaryCurrencyChange(e.target.value)}
              className="w-full border rounded-md p-2 bg-background"
            >
              {sortedCurrencies.map((currency: Currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Display Currencies Section */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Display Currencies</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select which currencies you want to see in conversion options and drop-downs.
          </p>
          
          <div className="relative max-w-md">
            <label htmlFor="displayCurrencies" className="block text-sm font-medium mb-2">
              Display Currencies
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex justify-between items-center border rounded-md p-2 bg-background"
              aria-expanded={dropdownOpen}
            >
              <span>
                {selectedCurrencies.length === 0 
                  ? 'Select currencies' 
                  : `${selectedCurrencies.length} currencies selected`}
              </span>
              <ChevronsUpDown size={16} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2 space-y-1">
                  {sortedCurrencies.map((currency) => (
                    <div
                      key={currency.code}
                      className={cn(
                        "flex items-center px-2 py-1.5 rounded-sm cursor-pointer",
                        selectedCurrencies.includes(currency.code) 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleCurrency(currency.code)}
                    >
                      <div className="flex-1">
                        {currency.code} - {currency.name} ({currency.symbol})
                      </div>
                      {selectedCurrencies.includes(currency.code) && (
                        <Check size={16} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={saveDisplayCurrencies}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80"
          >
            Save Display Currencies
          </button>
        </section>

        {/* Conversion Options */}
        <section className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Conversion Options</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoConvert"
                checked={autoConvertEnabled}
                onChange={toggleAutoConvert}
                className="h-4 w-4 text-primary rounded border-gray-300"
              />
              <label htmlFor="autoConvert" className="ml-2 text-sm">
                Automatically convert amounts to my primary currency
              </label>
            </div>
            
            <div>
              <label htmlFor="preferredExchange" className="block text-sm font-medium mb-2">
                Preferred Exchange Source
              </label>
              <select
                id="preferredExchange"
                value={preferredExchange}
                onChange={(e) => handleExchangeChange(e.target.value)}
                className="w-full max-w-md border rounded-md p-2 bg-background"
              >
                <option value="binance">Binance</option>
                <option value="coinbase">Coinbase</option>
                <option value="kraken">Kraken</option>
                <option value="forex">ForEx</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Exchange rates will be prioritized from your selected source.
              </p>
            </div>
          </div>
        </section>

        {/* Currency Converter */}
        <CurrencyConverter 
          defaultFromCurrency={primaryCurrency} 
          className="bg-white shadow rounded-lg"
        />
      </div>
    </div>
  );
}