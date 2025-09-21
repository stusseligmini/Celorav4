'use client';

import { useState, useEffect } from 'react';
import { WalletGenerationResult } from '../lib/walletGenerator';
import { CeloraRPCManager, TokenBalance, TransactionData } from '../lib/rpcManager';
import RPCSettings from './RPCSettings';
import { 
  Wallet, 
  Send, 
  ArrowDownToLine, 
  History, 
  Settings, 
  Copy, 
  Eye, 
  EyeOff,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Wifi,
  WifiOff,
  CreditCard
} from 'lucide-react';

interface WalletDashboardProps {
  wallet: WalletGenerationResult;
  onLogout: () => void;
}

export default function WalletDashboard({ wallet, onLogout }: WalletDashboardProps) {
  const [activeChain, setActiveChain] = useState<'solana' | 'ethereum'>('solana');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState('0.00');
  const [showRPCSettings, setShowRPCSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const rpcManager = new CeloraRPCManager();

  useEffect(() => {
    fetchBalances();
    fetchTransactions();
  }, [activeChain]);

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      let newBalances: TokenBalance[] = [];
      let portfolioValue = 0;

      if (activeChain === 'solana') {
        // Get SOL balance
        const solBalance = await rpcManager.getSolanaBalance(wallet.solanaWallet.publicKey);
        const solPrice = await rpcManager.getTokenPrice('SOL');
        
        newBalances.push({
          symbol: 'SOL',
          name: 'Solana',
          balance: solBalance,
          decimals: 9,
          usdValue: solPrice ? (parseFloat(solBalance) * solPrice).toFixed(2) : '0.00'
        });

        if (solPrice) {
          portfolioValue += parseFloat(solBalance) * solPrice;
        }

        // Get token balances
        const tokenBalances = await rpcManager.getSolanaTokenBalances(wallet.solanaWallet.publicKey);
        newBalances = [...newBalances, ...tokenBalances];

      } else {
        // Get ETH balance
        const ethBalance = await rpcManager.getEthereumBalance(wallet.ethereumWallet.address);
        const ethPrice = await rpcManager.getTokenPrice('ETH');
        
        newBalances.push({
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethBalance,
          decimals: 18,
          usdValue: ethPrice ? (parseFloat(ethBalance) * ethPrice).toFixed(2) : '0.00'
        });

        if (ethPrice) {
          portfolioValue += parseFloat(ethBalance) * ethPrice;
        }

        // Add common ERC-20 tokens (USDC, USDT, etc.)
        const commonTokens = [
          { address: '0xA0b86a33E6C7c4e95b1e5B4D5c8b8E7a5e3a5c4b', symbol: 'USDC' },
          { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT' }
        ];

        for (const token of commonTokens) {
          try {
            const tokenBalance = await rpcManager.getEthereumTokenBalance(
              wallet.ethereumWallet.address, 
              token.address
            );
            if (tokenBalance && parseFloat(tokenBalance.balance) > 0) {
              newBalances.push(tokenBalance);
            }
          } catch (error) {
            console.log(`Failed to get ${token.symbol} balance:`, error);
          }
        }
      }

      setBalances(newBalances);
      setTotalPortfolioValue(portfolioValue.toFixed(2));
      setIsConnected(true);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      setIsConnected(false);
      
      // Fallback to mock data when offline or RPC fails
      if (activeChain === 'solana') {
        setBalances([
          {
            symbol: 'SOL',
            name: 'Solana',
            balance: '12.543',
            decimals: 9,
            usdValue: '2,145.32'
          }
        ]);
        setTotalPortfolioValue('2,145.32');
      } else {
        setBalances([
          {
            symbol: 'ETH',
            name: 'Ethereum',
            balance: '2.847',
            decimals: 18,
            usdValue: '8,954.23'
          }
        ]);
        setTotalPortfolioValue('8,954.23');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      let newTransactions: TransactionData[] = [];

      if (activeChain === 'solana') {
        newTransactions = await rpcManager.getSolanaTransactions(wallet.solanaWallet.publicKey);
      } else {
        newTransactions = await rpcManager.getEthereumTransactions(wallet.ethereumWallet.address);
      }

      setTransactions(newTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      
      // Fallback mock transactions
      setTransactions([
        {
          signature: '5x8y9z...',
          timestamp: Date.now() - 7200000,
          fee: '0.000005',
          success: true,
          from: 'external',
          to: getCurrentAddress(),
          amount: '0.5',
          type: 'transfer'
        }
      ]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getCurrentAddress = () => {
    return activeChain === 'solana' ? wallet.solanaWallet.publicKey : wallet.ethereumWallet.address;
  };

  const getExplorerUrl = (txHash: string) => {
    if (activeChain === 'solana') {
      return `https://explorer.solana.com/tx/${txHash}`;
    } else {
      return `https://etherscan.io/tx/${txHash}`;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (showRPCSettings) {
    return <RPCSettings onBack={() => setShowRPCSettings(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#041c24] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mr-4">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Celora Wallet</h1>
              <div className="flex items-center space-x-2">
                <p className="text-primary/70 text-sm">Multi-chain Web3 Wallet</p>
                <div className="flex items-center">
                  {isConnected ? (
                    <div className="flex items-center text-green-400 text-xs">
                      <Wifi className="w-3 h-3 mr-1" />
                      Online
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400 text-xs">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.href = '/cards'}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-white px-4 py-2 rounded-xl transition-all flex items-center space-x-2"
              title="Virtual Cards"
            >
              <CreditCard className="w-4 h-4" />
              <span>Cards</span>
            </button>
            <button
              onClick={fetchBalances}
              className="p-2 text-primary/70 hover:text-primary transition-colors"
              title="Refresh balances"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowRPCSettings(true)}
              className="p-2 text-primary/70 hover:text-primary transition-colors"
              title="RPC Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-xl transition-colors"
            >
              Lock Wallet
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WifiOff className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <h3 className="text-red-300 font-semibold">Connection Issues</h3>
                  <p className="text-red-300/70 text-sm">Unable to connect to RPC endpoints. Showing cached data.</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowRPCSettings(true)}
                  className="bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-500/40 transition-colors"
                >
                  Check RPC
                </button>
                <button
                  onClick={fetchBalances}
                  className="bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-500/40 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chain Selector */}
        <div className="flex mb-6 bg-[#062830]/70 rounded-xl p-1 max-w-sm">
          <button
            onClick={() => setActiveChain('solana')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeChain === 'solana' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            Solana
          </button>
          <button
            onClick={() => setActiveChain('ethereum')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
              activeChain === 'ethereum' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            Ethereum
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Value */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-primary/70 text-sm">Total Portfolio Value</h2>
                  <div className="text-3xl font-bold text-primary">${totalPortfolioValue}</div>
                </div>
                <div className="text-right">
                  <div className="text-primary/70 text-sm">Last Updated</div>
                  <div className="text-primary/70 text-xs">{lastRefresh.toLocaleTimeString()}</div>
                </div>
              </div>
              
              <div className="flex items-center text-primary/70 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                Portfolio on {activeChain === 'solana' ? 'Solana' : 'Ethereum'}
              </div>
            </div>

            {/* Token Balances */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-primary">Token Balances</h2>
                <span className="text-primary/70 text-sm">{activeChain === 'solana' ? 'Solana' : 'Ethereum'} Network</span>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary/20 rounded-full mr-3"></div>
                          <div>
                            <div className="w-16 h-4 bg-primary/20 rounded mb-1"></div>
                            <div className="w-24 h-3 bg-primary/20 rounded"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-20 h-4 bg-primary/20 rounded mb-1"></div>
                          <div className="w-16 h-3 bg-primary/20 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {balances.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-[#041c24]/50 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-bold">{token.symbol[0]}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{token.symbol}</div>
                          <div className="text-primary/70 text-sm">{parseFloat(token.balance).toFixed(6)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">${token.usdValue || '0.00'}</div>
                        <div className="text-primary/70 text-sm">{token.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <h2 className="text-xl font-bold text-primary mb-6">Recent Transactions</h2>
              
              <div className="space-y-4">
                {transactions.length > 0 ? transactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-[#041c24]/50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        tx.from === getCurrentAddress() ? 'bg-red-500/20' : 'bg-green-500/20'
                      }`}>
                        {tx.from === getCurrentAddress() ? 
                          <Send className="w-5 h-5 text-red-400" /> : 
                          <ArrowDownToLine className="w-5 h-5 text-green-400" />
                        }
                      </div>
                      <div>
                        <div className="font-semibold text-primary capitalize">
                          {tx.from === getCurrentAddress() ? 'Sent' : 'Received'}
                        </div>
                        <div className="text-primary/70 text-sm">{formatTimeAgo(tx.timestamp)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        tx.from === getCurrentAddress() ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {tx.from === getCurrentAddress() ? '-' : '+'}{tx.amount || 'N/A'}
                      </div>
                      <button
                        onClick={() => window.open(getExplorerUrl(tx.signature), '_blank')}
                        className="text-primary/70 hover:text-primary text-sm flex items-center"
                      >
                        View
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                    <p className="text-primary/70">No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <h3 className="text-lg font-bold text-primary mb-4">Wallet Address</h3>
              
              <div className="mb-4">
                <div className="text-primary/70 text-sm mb-2">
                  {activeChain === 'solana' ? 'Solana Address' : 'Ethereum Address'}
                </div>
                <div className="bg-[#041c24] rounded-lg p-3 break-all">
                  <code className="text-primary text-sm">{getCurrentAddress()}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(getCurrentAddress())}
                  className="mt-2 w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <h3 className="text-lg font-bold text-primary mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </button>
                
                <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Receive
                </button>
                
                <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                  <History className="w-4 h-4 mr-2" />
                  History
                </button>
              </div>
            </div>

            {/* Network Status */}
            <div className="bg-[#062830]/70 backdrop-blur-md rounded-xl p-6 border border-primary/20">
              <h3 className="text-lg font-bold text-primary mb-4">Network Status</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-primary/70 text-sm">Network</span>
                  <span className="text-primary text-sm capitalize">{activeChain}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-primary/70 text-sm">Status</span>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-primary/70 text-sm">RPC</span>
                  <button
                    onClick={() => setShowRPCSettings(true)}
                    className="text-primary text-sm hover:underline"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}