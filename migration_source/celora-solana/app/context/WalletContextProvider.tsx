'use client';

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletContextProviderProps {
  children: React.ReactNode;
  network?: WalletAdapterNetwork;
}

export const WalletContextProvider: React.FC<WalletContextProviderProps> = ({ 
  children, 
  network = WalletAdapterNetwork.Mainnet 
}) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const endpoint = useMemo(() => {
    if (network === WalletAdapterNetwork.Mainnet) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
    }
    return clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      /**
       * Vi bruker Phantom Wallet som vår primære wallet-løsning for Celora
       * Solflare er tilgjengelig som et sekundært alternativ
       */
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      // Vi fjerner andre wallet-alternativer for å fokusere på Phantom
      // Disse kan legges til igjen hvis vi ønsker å støtte flere wallets senere
      // new TorusWalletAdapter(),
      // new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};