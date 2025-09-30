'use client';

import React, { useState, useEffect } from 'react';
import NetworkStatusIndicator from '@/components/NetworkStatusIndicator';
import WebSocketReconnector, { ConnectionStatus } from '@/components/WebSocketReconnector';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import { CurrencyAmount, CurrencyConverter } from '@/components/CurrencyFormatter';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';

const NetworkStatusDemo = () => {
  const [online, setOnline] = useState(true);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [amount, setAmount] = useState(100);
  const { primaryCurrency, displayCurrencies, updatePrimaryCurrency } = useCurrencyPreferences();
  const { currencies, refreshExchangeRates, lastExchangeRateUpdate } = useMultiCurrency();
  
  // Toggle online/offline status for demo purposes
  const toggleOnlineStatus = () => {
    setOnline(!online);
  };

  // Simulate going offline/online
  useEffect(() => {
    // This is only for demonstration, it doesn't actually change network status
    // but simulates how the components would react to network changes
    if (typeof window !== 'undefined') {
      const originalOnline = window.navigator.onLine;
      
      // Create a custom event to simulate online/offline status
      const dispatchNetworkEvent = () => {
        const event = new Event(online ? 'online' : 'offline');
        window.dispatchEvent(event);
      };
      
      // Dispatch the event after a short delay
      const timeoutId = setTimeout(dispatchNetworkEvent, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [online]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Network Status &amp; Multi-Currency Components</h1>
      
      {/* Network Status Demo */}
      <section className="mb-12 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Network Status Indicators</h2>
        <p className="mb-4 text-gray-600">
          These components show the current network status and exchange rate freshness.
          Click the button below to simulate going offline/online.
        </p>
        
        <div className="flex flex-col gap-6 mt-6">
          <div className="flex items-center gap-4">
            <NetworkStatusIndicator variant="minimal" />
            <span className="text-sm text-gray-500">Minimal variant</span>
          </div>
          
          <div className="flex items-center gap-4">
            <NetworkStatusIndicator variant="badge" />
            <span className="text-sm text-gray-500">Badge variant</span>
          </div>
          
          <div className="flex items-center gap-4">
            <NetworkStatusIndicator variant="full" />
            <span className="text-sm text-gray-500">Full variant</span>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={toggleOnlineStatus}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Simulate {online ? "Going Offline" : "Going Online"}
            </button>
            
            {lastExchangeRateUpdate && (
              <p className="mt-2 text-sm text-gray-500">
                Last exchange rate update: {new Date(lastExchangeRateUpdate).toLocaleString()}
              </p>
            )}
            
            <button 
              onClick={() => refreshExchangeRates()}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Refresh Exchange Rates
            </button>
          </div>
        </div>
      </section>
      
      {/* WebSocket Reconnector Demo */}
      <section className="mb-12 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">WebSocket Reconnection</h2>
        <p className="mb-4 text-gray-600">
          This component handles WebSocket connections with automatic reconnection on failure.
          Note: The WebSocket URL used here is just for demonstration.
        </p>
        
        <div className="mt-6">
          <WebSocketReconnector 
            url="wss://demo.websocket.me/echo"
            onStatusChange={setWsStatus}
            autoConnect={false}
          />
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Current WebSocket status: <strong>{wsStatus}</strong>
            </p>
          </div>
        </div>
      </section>
      
      {/* Currency Components Demo */}
      <section className="mb-12 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Currency Components</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Currency Switcher</h3>
          <p className="mb-4 text-gray-600">
            Use this component to switch between different currencies.
          </p>
          
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Dropdown Variant:</h4>
              <CurrencySwitcher variant="dropdown" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Tabs Variant:</h4>
              <CurrencySwitcher variant="tabs" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Buttons Variant:</h4>
              <CurrencySwitcher variant="buttons" currencies={displayCurrencies} />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Currency Amount Display</h3>
          <p className="mb-4 text-gray-600">
            This component displays currency amounts with proper formatting.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="text-sm font-medium mb-2">Basic:</h4>
              <CurrencyAmount amount={amount} currency={primaryCurrency} />
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="text-sm font-medium mb-2">With target currency:</h4>
              <CurrencyAmount 
                amount={amount} 
                currency={primaryCurrency} 
                targetCurrency="EUR" 
              />
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="text-sm font-medium mb-2">Interactive:</h4>
              <CurrencyAmount 
                amount={amount} 
                currency={primaryCurrency}
                showConvertedValue={true} 
              />
            </div>
            
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="text-sm font-medium mb-2">With custom format:</h4>
              <CurrencyAmount 
                amount={amount} 
                currency={primaryCurrency}
                showCurrencyCode={true}
                className="font-bold"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjust amount:
            </label>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-500">Amount: {amount}</span>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Currency Converter</h3>
          <p className="mb-4 text-gray-600">
            Interactive currency converter component.
          </p>
          
          <div className="p-6 bg-gray-50 rounded">
            <CurrencyConverter 
              defaultAmount={100}
              showFee={true}
            />
          </div>
        </div>
      </section>
      
      <section className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Available Currencies</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currencies.map(currency => (
            <div 
              key={currency.code}
              className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => updatePrimaryCurrency(currency.code)}
            >
              <div className="font-medium">{currency.code}</div>
              <div className="text-sm text-gray-600">{currency.name}</div>
              <div className="text-xs text-gray-500">
                Symbol: {currency.symbol} ({currency.type})
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default NetworkStatusDemo;