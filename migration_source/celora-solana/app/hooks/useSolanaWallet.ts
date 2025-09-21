import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { useState, useEffect, useCallback } from 'react';
import BN from 'bn.js';

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  logoURI?: string;
}

export interface SolanaWalletState {
  balance: number;
  tokenBalances: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  transactions: any[];
}

export const useSolanaWallet = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  
  const [state, setState] = useState<SolanaWalletState>({
    balance: 0,
    tokenBalances: [],
    isLoading: false,
    error: null,
    transactions: []
  });

  // Fetch SOL balance
  const fetchSolBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      const balance = await connection.getBalance(publicKey);
      setState(prev => ({
        ...prev,
        balance: balance / LAMPORTS_PER_SOL,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch SOL balance'
      }));
    }
  }, [publicKey, connection]);

  // Fetch SPL token balances
  const fetchTokenBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Get all token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID
      });

      const tokens: TokenBalance[] = [];
      
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed;
        const tokenAmount = accountData.tokenAmount;
        const mint = accountData.mint;
        
        if (tokenAmount.uiAmount && tokenAmount.uiAmount > 0) {
          // Get token metadata (simplified)
          const tokenInfo = await getTokenInfo(mint);
          
          tokens.push({
            mint,
            symbol: tokenInfo?.symbol || 'UNKNOWN',
            name: tokenInfo?.name || 'Unknown Token',
            amount: parseFloat(tokenAmount.amount),
            decimals: tokenAmount.decimals,
            uiAmount: tokenAmount.uiAmount,
            logoURI: tokenInfo?.logoURI
          });
        }
      }
      
      setState(prev => ({
        ...prev,
        tokenBalances: tokens,
        isLoading: false,
        error: null
      }));
      
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch token balances'
      }));
    }
  }, [publicKey, connection]);

  // Fetch recent transactions
  const fetchTransactions = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      const transactions = [];
      
      for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature);
        if (tx) {
          transactions.push({
            signature: sig.signature,
            blockTime: tx.blockTime,
            slot: tx.slot,
            status: sig.confirmationStatus,
            fee: tx.meta?.fee || 0,
            instructions: tx.transaction.message.instructions
          });
        }
      }
      
      setState(prev => ({
        ...prev,
        transactions,
        error: null
      }));
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch transactions'
      }));
    }
  }, [publicKey, connection]);

  // Send SOL transaction
  const sendSol = useCallback(async (toAddress: string, amount: number) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const toPublicKey = new PublicKey(toAddress);
      const lamports = amount * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toPublicKey,
          lamports
        })
      );
      
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Refresh balances
      await fetchSolBalance();
      await fetchTransactions();
      
      return signature;
    } catch (error) {
      console.error('Error sending SOL:', error);
      throw error;
    }
  }, [publicKey, sendTransaction, connection, fetchSolBalance, fetchTransactions]);

  // Send SPL token
  const sendToken = useCallback(async (
    tokenMint: string,
    toAddress: string,
    amount: number,
    decimals: number
  ) => {
    if (!publicKey || !sendTransaction) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // This is a simplified implementation
      // In production, you'd need to handle token account creation, etc.
      const toPublicKey = new PublicKey(toAddress);
      const mintPublicKey = new PublicKey(tokenMint);
      
      // Get or create associated token accounts
      // Implementation would go here...
      
      throw new Error('SPL token transfers not fully implemented in this demo');
    } catch (error) {
      console.error('Error sending token:', error);
      throw error;
    }
  }, [publicKey, sendTransaction, connection]);

  // Swap tokens (simplified DEX integration)
  const swapTokens = useCallback(async (
    fromMint: string,
    toMint: string,
    amount: number
  ) => {
    try {
      // This would integrate with Jupiter, Raydium, or other DEX aggregators
      // For now, it's a placeholder
      throw new Error('Token swapping not implemented in this demo');
    } catch (error) {
      console.error('Error swapping tokens:', error);
      throw error;
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    await Promise.all([
      fetchSolBalance(),
      fetchTokenBalances(),
      fetchTransactions()
    ]);
    
    setState(prev => ({ ...prev, isLoading: false }));
  }, [connected, publicKey, fetchSolBalance, fetchTokenBalances, fetchTransactions]);

  // Auto-refresh on connection change
  useEffect(() => {
    if (connected && publicKey) {
      refreshAll();
    } else {
      setState({
        balance: 0,
        tokenBalances: [],
        isLoading: false,
        error: null,
        transactions: []
      });
    }
  }, [connected, publicKey, refreshAll]);

  return {
    ...state,
    connected,
    publicKey,
    sendSol,
    sendToken,
    swapTokens,
    refreshAll,
    fetchSolBalance,
    fetchTokenBalances,
    fetchTransactions
  };
};

// Helper function to get token info
async function getTokenInfo(mint: string) {
  try {
    // In production, this would use a token registry API
    const knownTokens: Record<string, any> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        symbol: 'USDC',
        name: 'USD Coin',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        symbol: 'USDT',
        name: 'Tether USD',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
      },
      'So11111111111111111111111111111111111111112': {
        symbol: 'SOL',
        name: 'Wrapped SOL',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      }
    };
    
    return knownTokens[mint] || {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      logoURI: null
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
}