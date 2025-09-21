'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const CyanWalletButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <WalletMultiButton 
      className={`!bg-gradient-to-r !from-primary !to-secondary !rounded-xl !text-white !font-semibold ${className}`} 
    />
  );
};
