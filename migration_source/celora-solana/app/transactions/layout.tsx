'use client';

import React from 'react';
import { WalletContextProvider } from '../context/WalletContextProvider';

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      {children}
    </WalletContextProvider>
  );
}
