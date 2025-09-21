import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedAccountData } from '@solana/web3.js';
import { ethers } from 'ethers';

export interface RPCEndpoint {
  name: string;
  url: string;
  network: 'mainnet' | 'testnet' | 'devnet';
  blockchain: 'solana' | 'ethereum';
  isCustom: boolean;
}

export interface TokenBalance {
  mint?: string; // Solana token mint
  address?: string; // Ethereum token address
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdValue?: string;
  logoUri?: string;
}

export interface TransactionData {
  signature: string;
  slot?: number; // Solana
  blockNumber?: number; // Ethereum
  timestamp: number;
  fee: string;
  success: boolean;
  from: string;
  to?: string;
  amount?: string;
  type: 'transfer' | 'swap' | 'stake' | 'other';
}

export class CeloraRPCManager {
  private solanaConnection: Connection | null = null;
  private ethereumProvider: ethers.JsonRpcProvider | null = null;
  
  // Default RPC endpoints
  private static readonly DEFAULT_ENDPOINTS: RPCEndpoint[] = [
    // Solana Mainnet
    {
      name: 'Helius RPC',
      url: 'https://rpc.helius.xyz/?api-key=YOUR_API_KEY',
      network: 'mainnet',
      blockchain: 'solana',
      isCustom: false
    },
    {
      name: 'QuickNode Solana',
      url: 'https://api.mainnet-beta.solana.com',
      network: 'mainnet',
      blockchain: 'solana',
      isCustom: false
    },
    {
      name: 'Solana RPC Pool',
      url: 'https://solana-api.projectserum.com',
      network: 'mainnet',
      blockchain: 'solana',
      isCustom: false
    },
    
    // Ethereum Mainnet
    {
      name: 'Infura',
      url: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      network: 'mainnet',
      blockchain: 'ethereum',
      isCustom: false
    },
    {
      name: 'Alchemy',
      url: 'https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY',
      network: 'mainnet',
      blockchain: 'ethereum',
      isCustom: false
    },
    {
      name: 'QuickNode Ethereum',
      url: 'https://api.quicknode.com/YOUR_ENDPOINT',
      network: 'mainnet',
      blockchain: 'ethereum',
      isCustom: false
    }
  ];

  constructor() {
    this.initializeDefaultConnections();
  }

  private initializeDefaultConnections() {
    // Initialize with fallback public RPC endpoints
    this.solanaConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    this.ethereumProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
  }

  // Solana Methods
  async connectToSolana(endpoint: RPCEndpoint): Promise<boolean> {
    try {
      this.solanaConnection = new Connection(endpoint.url, 'confirmed');
      
      // Test connection
      const version = await this.solanaConnection.getVersion();
      console.log('Connected to Solana:', version);
      return true;
    } catch (error) {
      console.error('Failed to connect to Solana RPC:', error);
      return false;
    }
  }

  async getSolanaBalance(publicKey: string): Promise<string> {
    if (!this.solanaConnection) throw new Error('Solana connection not initialized');
    
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.solanaConnection.getBalance(pubKey);
      return (balance / LAMPORTS_PER_SOL).toString();
    } catch (error) {
      console.error('Failed to get Solana balance:', error);
      throw error;
    }
  }

  async getSolanaTokenBalances(publicKey: string): Promise<TokenBalance[]> {
    if (!this.solanaConnection) throw new Error('Solana connection not initialized');
    
    try {
      const pubKey = new PublicKey(publicKey);
      const tokenAccounts = await this.solanaConnection.getParsedTokenAccountsByOwner(
        pubKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const balances: TokenBalance[] = [];
      
      for (const account of tokenAccounts.value) {
        const accountData = account.account.data as ParsedAccountData;
        const info = accountData.parsed.info;
        
        if (parseFloat(info.tokenAmount.uiAmount) > 0) {
          balances.push({
            mint: info.mint,
            symbol: 'Unknown', // You would need to fetch token metadata
            name: 'Unknown Token',
            balance: info.tokenAmount.uiAmount.toString(),
            decimals: info.tokenAmount.decimals,
          });
        }
      }
      
      return balances;
    } catch (error) {
      console.error('Failed to get Solana token balances:', error);
      return [];
    }
  }

  async getSolanaTransactions(publicKey: string, limit: number = 10): Promise<TransactionData[]> {
    if (!this.solanaConnection) throw new Error('Solana connection not initialized');
    
    try {
      const pubKey = new PublicKey(publicKey);
      const signatures = await this.solanaConnection.getSignaturesForAddress(pubKey, { limit });
      
      const transactions: TransactionData[] = [];
      
      for (const sig of signatures) {
        transactions.push({
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          fee: '0.000005', // Approximate Solana fee
          success: !sig.err,
          from: publicKey,
          type: 'transfer'
        });
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get Solana transactions:', error);
      return [];
    }
  }

  // Ethereum Methods
  async connectToEthereum(endpoint: RPCEndpoint): Promise<boolean> {
    try {
      this.ethereumProvider = new ethers.JsonRpcProvider(endpoint.url);
      
      // Test connection
      const network = await this.ethereumProvider.getNetwork();
      console.log('Connected to Ethereum:', network.name);
      return true;
    } catch (error) {
      console.error('Failed to connect to Ethereum RPC:', error);
      return false;
    }
  }

  async getEthereumBalance(address: string): Promise<string> {
    if (!this.ethereumProvider) throw new Error('Ethereum provider not initialized');
    
    try {
      const balance = await this.ethereumProvider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get Ethereum balance:', error);
      throw error;
    }
  }

  async getEthereumTokenBalance(address: string, tokenAddress: string): Promise<TokenBalance | null> {
    if (!this.ethereumProvider) throw new Error('Ethereum provider not initialized');
    
    try {
      // ERC-20 ABI for balanceOf and decimals
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ];
      
      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.ethereumProvider);
      
      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
        contract.symbol(),
        contract.name()
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return {
        address: tokenAddress,
        symbol,
        name,
        balance: formattedBalance,
        decimals: Number(decimals)
      };
    } catch (error) {
      console.error('Failed to get Ethereum token balance:', error);
      return null;
    }
  }

  async getEthereumTransactions(address: string, limit: number = 10): Promise<TransactionData[]> {
    if (!this.ethereumProvider) throw new Error('Ethereum provider not initialized');
    
    try {
      // Get latest block
      const latestBlock = await this.ethereumProvider.getBlockNumber();
      const transactions: TransactionData[] = [];
      
      // This is a simplified approach - in production, you'd use a service like Etherscan API
      for (let i = 0; i < Math.min(limit, 10); i++) {
        const block = await this.ethereumProvider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
          for (const txHash of block.transactions.slice(0, 5)) {
            if (typeof txHash === 'string') {
              const tx = await this.ethereumProvider.getTransaction(txHash);
              if (tx && (tx.from === address || tx.to === address)) {
                const receipt = await this.ethereumProvider.getTransactionReceipt(tx.hash);
                
                transactions.push({
                  signature: tx.hash,
                  blockNumber: tx.blockNumber || 0,
                  timestamp: block.timestamp * 1000,
                  fee: ethers.formatEther((tx.gasPrice || BigInt(0)) * (tx.gasLimit || BigInt(0))),
                  success: receipt?.status === 1,
                  from: tx.from,
                  to: tx.to || undefined,
                  amount: ethers.formatEther(tx.value),
                  type: 'transfer'
                });
              }
            }
          }
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get Ethereum transactions:', error);
      return [];
    }
  }

  // Utility Methods
  static getDefaultEndpoints(): RPCEndpoint[] {
    return [...this.DEFAULT_ENDPOINTS];
  }

  async testConnection(endpoint: RPCEndpoint): Promise<boolean> {
    try {
      if (endpoint.blockchain === 'solana') {
        const connection = new Connection(endpoint.url, 'confirmed');
        await connection.getVersion();
        return true;
      } else if (endpoint.blockchain === 'ethereum') {
        const provider = new ethers.JsonRpcProvider(endpoint.url);
        await provider.getNetwork();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  getCurrentSolanaConnection(): Connection | null {
    return this.solanaConnection;
  }

  getCurrentEthereumProvider(): ethers.JsonRpcProvider | null {
    return this.ethereumProvider;
  }

  // Price fetching (you would integrate with CoinGecko or similar)
  async getTokenPrice(symbol: string): Promise<number | null> {
    try {
      // Mock implementation - replace with actual price API
      const mockPrices: { [key: string]: number } = {
        'SOL': 171.23,
        'ETH': 3156.42,
        'USDC': 1.00,
        'USDT': 1.00,
      };
      
      return mockPrices[symbol.toUpperCase()] || null;
    } catch (error) {
      console.error('Failed to get token price:', error);
      return null;
    }
  }

  async getPortfolioValue(solanaAddress: string, ethereumAddress: string): Promise<{
    total: number;
    solana: number;
    ethereum: number;
  }> {
    try {
      let solanaValue = 0;
      let ethereumValue = 0;

      // Get Solana portfolio value
      const solBalance = await this.getSolanaBalance(solanaAddress);
      const solPrice = await this.getTokenPrice('SOL');
      if (solPrice) {
        solanaValue += parseFloat(solBalance) * solPrice;
      }

      // Get Ethereum portfolio value
      const ethBalance = await this.getEthereumBalance(ethereumAddress);
      const ethPrice = await this.getTokenPrice('ETH');
      if (ethPrice) {
        ethereumValue += parseFloat(ethBalance) * ethPrice;
      }

      return {
        total: solanaValue + ethereumValue,
        solana: solanaValue,
        ethereum: ethereumValue
      };
    } catch (error) {
      console.error('Failed to calculate portfolio value:', error);
      return { total: 0, solana: 0, ethereum: 0 };
    }
  }
}