'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Copy, QrCode, CheckCircle, Share } from 'lucide-react';
import Link from 'next/link';

export default function ReceivePage() {
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);
  const [selectedToken, setSelectedToken] = useState('SOL');
  
  const tokens = [
    { symbol: 'SOL', name: 'Solana', network: 'Solana Network' },
    { symbol: 'USDC', name: 'USD Coin', network: 'Solana Network' },
    { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum Network' },
    { symbol: 'USDT', name: 'Tether', network: 'Ethereum Network' },
  ];

  const copyToClipboard = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareAddress = async () => {
    if (publicKey && navigator.share) {
      try {
        await navigator.share({
          title: 'My Celora Wallet Address',
          text: `Send ${selectedToken} to my wallet:`,
          url: publicKey.toString(),
        });
      } catch (error) {
        // Fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-card pt-20 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4 p-2 hover:bg-dark-card rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Receive Crypto</h1>
        </div>

        {!publicKey ? (
          <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-8 text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-dark-text-secondary mb-4">
              Please connect your wallet to view your receiving address.
            </p>
            <Link 
              href="/" 
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Go Back Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Token Selection */}
            <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-6">
              <h3 className="font-semibold mb-4">Select Token to Receive</h3>
              <div className="grid grid-cols-1 gap-2">
                {tokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => setSelectedToken(token.symbol)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      selectedToken === token.symbol
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border bg-dark-surface/50 hover:bg-dark-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-dark-text-secondary">{token.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-dark-text-secondary">{token.network}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-6 text-center">
              <h3 className="font-semibold mb-4">Your {selectedToken} Address</h3>
              
              {/* QR Code Placeholder */}
              <div className="w-48 h-48 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center">
                <div className="text-dark-bg text-xs font-mono break-all p-4 text-center">
                  {publicKey.toString()}
                </div>
              </div>

              {/* Address Display */}
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4 mb-4">
                <div className="text-xs text-dark-text-secondary mb-1">Wallet Address</div>
                <div className="font-mono text-sm break-all select-all">
                  {publicKey.toString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-dark-surface hover:bg-dark-border border border-dark-border text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copy Address
                    </>
                  )}
                </button>
                
                <button
                  onClick={shareAddress}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center"
                >
                  <Share className="w-5 h-5 mr-2" />
                  Share
                </button>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <h4 className="font-semibold text-warning mb-2">Important Notes:</h4>
              <ul className="text-sm text-dark-text-secondary space-y-1">
                <li>• Only send {selectedToken} and compatible tokens to this address</li>
                <li>• Sending incompatible tokens may result in permanent loss</li>
                <li>• Always verify the address before sending funds</li>
                <li>• Network fees apply for all transactions</li>
              </ul>
            </div>

            {/* Network Information */}
            <div className="bg-dark-surface/50 border border-dark-border/50 rounded-xl p-4">
              <h4 className="font-semibold mb-2">Network Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Network:</span>
                  <span>{tokens.find(t => t.symbol === selectedToken)?.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Token Standard:</span>
                  <span>{selectedToken === 'SOL' ? 'Native' : 'SPL Token'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Confirmation Time:</span>
                  <span>~1-2 seconds</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
