'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SendPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('SOL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mock tokens - replace with real token fetching
  const tokens = [
    { symbol: 'SOL', name: 'Solana', balance: 5.234, decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', balance: 1250.50, decimals: 6 },
    { symbol: 'RAY', name: 'Raydium', balance: 123.45, decimals: 6 },
  ];

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const sendTransaction = async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return;
    }

    if (!validateAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount');
      return;
    }

    if (parseFloat(amount) > (selectedTokenData?.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (selectedToken === 'SOL') {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipient),
            lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signedTransaction = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        await connection.confirmTransaction(signature, 'confirmed');
        
        setSuccess(`Transaction sent successfully! Signature: ${signature}`);
        setRecipient('');
        setAmount('');
      } else {
        // Handle SPL token transfers
        setError('SPL token transfers not implemented yet');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Transaction failed');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl font-bold">Send Crypto</h1>
        </div>

        <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-6 space-y-6">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Select Token</label>
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
                      <div className="font-medium">{token.balance.toFixed(4)}</div>
                      <div className="text-sm text-dark-text-secondary">{token.symbol}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium mb-3">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter wallet address..."
              className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
            />
            {recipient && !validateAddress(recipient) && (
              <p className="text-error text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Invalid address format
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-3">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors pr-20"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-text-secondary">
                {selectedToken}
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-dark-text-secondary">
                Balance: {selectedTokenData?.balance.toFixed(4)} {selectedToken}
              </p>
              <button
                onClick={() => setAmount(selectedTokenData?.balance.toString() || '0')}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium"
              >
                Max
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-dark-surface/50 rounded-xl p-4 border border-dark-border/50">
              <h3 className="font-medium mb-3">Transaction Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Amount:</span>
                  <span>{amount} {selectedToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-text-secondary">Network Fee:</span>
                  <span>~0.000005 SOL</span>
                </div>
                <div className="border-t border-dark-border/50 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{amount} {selectedToken}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-success">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                {success}
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={sendTransaction}
            disabled={!publicKey || !recipient || !amount || !validateAddress(recipient) || isLoading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-dark-surface disabled:text-dark-text-secondary text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send {selectedToken}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
