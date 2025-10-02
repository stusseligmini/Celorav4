'use client';

import React from 'react';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import { CurrencyFormat, CurrencyAmount, CurrencyConverter } from '@/components/CurrencyFormatter';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DemoCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function DemoCard({ title, children, className }: DemoCardProps) {
  return (
    <div className={cn("bg-white shadow-md rounded-lg p-6", className)}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function MultiCurrencyDemo() {
  const { currencies } = useMultiCurrency();
  const { primaryCurrency } = useCurrencyPreferences();
  
  // Example transaction data
  const transactions = [
    { id: 1, amount: 1299.99, currency: 'USD', description: 'Laptop purchase' },
    { id: 2, amount: 0.045, currency: 'BTC', description: 'Crypto investment' },
    { id: 3, amount: 1250, currency: 'EUR', description: 'Rent payment' },
    { id: 4, amount: 25000, currency: 'JPY', description: 'Trip expenses' },
    { id: 5, amount: 4.75, currency: 'ETH', description: 'NFT purchase' },
  ];

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Currency System Demo</h1>
        <p className="text-muted-foreground mb-6">
          This page demonstrates the multi-currency features of the Celora platform.
        </p>
        <div className="flex gap-4 mb-4">
          <Link 
            href="/settings/currency-preferences" 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Currency Settings
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currency Switcher Demo */}
        <DemoCard title="Currency Switcher">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Dropdown Variant</h3>
              <CurrencySwitcher variant="dropdown" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Tabs Variant</h3>
              <CurrencySwitcher variant="tabs" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Buttons Variant</h3>
              <CurrencySwitcher variant="buttons" />
            </div>
          </div>
        </DemoCard>

        {/* Currency Formatting Demo */}
        <DemoCard title="Currency Formatting">
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium mb-2">Standard Format</h3>
              <div className="grid grid-cols-2 gap-4">
                <CurrencyFormat amount={1234.56} currency="USD" />
                <CurrencyFormat amount={1234.56} currency="EUR" />
                <CurrencyFormat amount={1234.56} currency="GBP" />
                <CurrencyFormat amount={1234.56} currency="JPY" />
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-2">Crypto Format</h3>
              <div className="grid grid-cols-2 gap-4">
                <CurrencyFormat amount={0.00123456} currency="BTC" />
                <CurrencyFormat amount={1.234567} currency="ETH" />
                <CurrencyFormat amount={1234.56} currency="USDC" />
                <CurrencyFormat amount={0.000000789} currency="BTC" />
              </div>
            </div>
          </div>
        </DemoCard>

        {/* Currency Amount Demo */}
        <DemoCard title="Currency Conversion Display">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click on any amount to toggle between original and converted values.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b hover:bg-muted">
                      <td className="p-2">{tx.description}</td>
                      <td className="text-right p-2">
                        <CurrencyFormat amount={tx.amount} currency={tx.currency} showCode />
                      </td>
                      <td className="text-right p-2">
                        <CurrencyAmount 
                          amount={tx.amount} 
                          currency={tx.currency}
                          targetCurrency={primaryCurrency}
                          showConvertedValue
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DemoCard>

        {/* Currency Converter Demo */}
        <DemoCard title="Currency Converter Tool">
          <CurrencyConverter />
        </DemoCard>
        
        {/* Supported Currencies */}
        <DemoCard 
          title="Supported Currencies" 
          className="col-span-1 md:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currencies.filter(c => c.isActive).map(currency => (
              <div 
                key={currency.code} 
                className="border rounded-md p-3 flex items-center"
              >
                <div className="mr-3 text-xl">{currency.symbol}</div>
                <div>
                  <div className="font-medium">{currency.code}</div>
                  <div className="text-sm text-muted-foreground">{currency.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {currency.type} • {currency.decimals} decimals
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DemoCard>
      </div>
    </div>
  );
}
