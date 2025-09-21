'use client';

import React from 'react';
import { WalletContextProvider } from '../context/WalletContextProvider';

export default function ExchangeLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      {children}
    </WalletContextProvider>
  );
}
