'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CyanWalletButton } from './CyanWalletButton';

export const PhantomWalletButton: React.FC<{ className?: string, onClick?: () => void }> = ({ className = '', onClick }) => {
  const { wallet, connected, select, wallets } = useWallet();
  const [isPhantom, setIsPhantom] = useState(false);
  
  useEffect(() => {
    // Check if Phantom is available in the browser
    const phantom = window.phantom?.solana;
    setIsPhantom(!!phantom && !!phantom.isPhantom);
    
    // Automatically select Phantom if available and not already selected
    if (!!phantom && !!phantom.isPhantom && wallets.length > 0) {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet && (!wallet || wallet.adapter.name !== 'Phantom')) {
        select(phantomWallet.adapter.name);
      }
    }
  }, [wallet, wallets, select]);
  
  const handleClick = () => {
    // If Phantom is not installed, direct to installation page
    if (!isPhantom && !connected) {
      window.open('https://phantom.app/', '_blank');
    } else if (onClick) {
      // Otherwise, use the provided onClick handler
      onClick();
    }
  };
  
  return (
    <div className="relative" onClick={handleClick}>
      <CyanWalletButton 
        className={className}
      />
      {!isPhantom && !connected && (
        <div className="mt-2 text-center">
          <p className="text-sm text-accent mb-1">Phantom Wallet anbefales</p>
          <a 
            href="https://phantom.app/" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs text-primary underline hover:text-secondary"
          >
            Installer Phantom
          </a>
        </div>
      )}
      {isPhantom && connected && wallet?.adapter.name === 'Phantom' && (
        <div className="mt-2 text-center">
          <p className="text-xs text-primary">Du bruker Phantom Wallet</p>
        </div>
      )}
    </div>
  );
};

// Dette er en typedeklarasjon for å fortelle TypeScript om phantom objektet i window
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect?: () => Promise<{ publicKey: any }>;
        disconnect?: () => Promise<void>;
      };
    };
  }
}
