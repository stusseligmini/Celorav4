'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletButton } from './PhantomWalletButton';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Send, ArrowUpDown } from 'lucide-react';

export const WalletComponent = () => {
  const { connected, publicKey } = useWallet();
  const {
    balance,
    tokenBalances,
    isLoading,
    error,
    transactions,
    sendSol,
    refreshAll
  } = useSolanaWallet();

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    recipient: '',
    amount: '',
    token: 'SOL'
  });
  const [sending, setSending] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (connected) {
      setLastUpdate(new Date());
    }
  }, [connected, balance, tokenBalances]);

  const handleSend = async () => {
    if (!sendForm.recipient || !sendForm.amount || !connected) return;
    
    try {
      setSending(true);
      
      if (sendForm.token === 'SOL') {
        const signature = await sendSol(sendForm.recipient, parseFloat(sendForm.amount));
        alert(`Transaction sent! Signature: ${signature}`);
      } else {
        alert('SPL token sending will be implemented in the next update');
      }
      
      setShowSendModal(false);
      setSendForm({ recipient: '', amount: '', token: 'SOL' });
      
    } catch (error) {
      console.error('Send failed:', error);
      alert('Transaction failed: ' + (error as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    await refreshAll();
    setLastUpdate(new Date());
  };

  const formatPublicKey = (key: string) => {
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center max-w-md w-full border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-300 mb-8">Connect your Solana wallet to access DeFi features</p>
          <PhantomWalletButton className="!py-3 !px-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Celora DeFi</h1>
              <p className="text-gray-300">
                {publicKey ? formatPublicKey(publicKey.toString()) : 'No wallet connected'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <PhantomWalletButton />
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {formatTimestamp(lastUpdate)}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SOL Balance */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">SOL Balance</h2>
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SOL</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {balance.toFixed(4)} SOL
            </div>
            <div className="text-gray-300 text-sm">
              ≈ ${(balance * 150).toFixed(2)} USD
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowSendModal(true)}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-2 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
              <button
                onClick={() => alert('Swap feature coming soon!')}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>Swap</span>
              </button>
            </div>
          </div>

          {/* Token Balances */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Token Balances</h2>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading tokens...</p>
              </div>
            ) : tokenBalances.length > 0 ? (
              <div className="space-y-3">
                {tokenBalances.map((token) => (
                  <div
                    key={token.mint}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {token.symbol.substring(0, 3)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{token.symbol}</p>
                        <p className="text-gray-400 text-sm">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {token.uiAmount.toFixed(token.decimals > 6 ? 6 : token.decimals)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {token.mint.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">No SPL tokens found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mt-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.signature}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                      <ArrowUpDown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {tx.signature.substring(0, 16)}...
                      </p>
                      <p className="text-gray-400 text-sm">
                        {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {tx.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Fee: {(tx.fee / LAMPORTS_PER_SOL).toFixed(6)} SOL
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">No transactions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Send SOL</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder="Enter Solana address..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.0000"
                  step="0.0001"
                  min="0"
                  max={balance}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available: {balance.toFixed(4)} SOL
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendForm.recipient || !sendForm.amount}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LAMPORTS_PER_SOL = 1000000000;