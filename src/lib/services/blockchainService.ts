/**
 * Blockchain Integration Service - Phase 5
 * Multi-chain connectivity and wallet operations
 */

import { ethers } from 'ethers';

// Types for blockchain connections
export interface BlockchainConfig {
  ethereum: {
    rpcUrl: string;
    testnetRpcUrl: string;
    privateKey?: string;
  };
  solana: {
    rpcUrl: string;
    testnetRpcUrl: string;
    privateKey?: string;
  };
  bitcoin: {
    rpcUrl: string;
    testnetRpcUrl: string;
    privateKey?: string;
  };
}

export interface WalletBalance {
  address: string;
  balance: string;
  currency: string;
  network: 'mainnet' | 'testnet';
}

export interface TransactionResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  fee?: string;
}

/**
 * Blockchain Integration Service
 * Handles multi-chain wallet operations and connectivity
 */
export class BlockchainService {
  private config: BlockchainConfig;
  private ethProvider?: ethers.JsonRpcProvider;
  private ethTestnetProvider?: ethers.JsonRpcProvider;

  constructor() {
    this.config = {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL || '',
        testnetRpcUrl: process.env.ETHEREUM_TESTNET_RPC_URL || '',
        privateKey: process.env.ETHEREUM_PRIVATE_KEY,
      },
      solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || '',
        testnetRpcUrl: process.env.SOLANA_TESTNET_RPC_URL || '',
        privateKey: process.env.SOLANA_PRIVATE_KEY,
      },
      bitcoin: {
        rpcUrl: process.env.BITCOIN_RPC_URL || '',
        testnetRpcUrl: process.env.BITCOIN_TESTNET_RPC_URL || '',
        privateKey: process.env.BITCOIN_PRIVATE_KEY,
      },
    };

    // Initialize Ethereum providers
    if (this.config.ethereum.rpcUrl) {
      this.ethProvider = new ethers.JsonRpcProvider(this.config.ethereum.rpcUrl);
    }
    if (this.config.ethereum.testnetRpcUrl) {
      this.ethTestnetProvider = new ethers.JsonRpcProvider(this.config.ethereum.testnetRpcUrl);
    }
  }

  /**
   * Test connectivity to all configured blockchain networks
   */
  async testConnectivity(): Promise<{
    ethereum: { mainnet: boolean; testnet: boolean; error?: string };
    solana: { mainnet: boolean; testnet: boolean; error?: string };
    bitcoin: { mainnet: boolean; testnet: boolean; error?: string };
  }> {
    const results = {
      ethereum: { mainnet: false, testnet: false, error: undefined as string | undefined },
      solana: { mainnet: false, testnet: false, error: undefined as string | undefined },
      bitcoin: { mainnet: false, testnet: false, error: undefined as string | undefined },
    };

    // Test Ethereum connectivity
    try {
      if (this.ethProvider) {
        const blockNumber = await this.ethProvider.getBlockNumber();
        results.ethereum.mainnet = blockNumber > 0;
      }
    } catch (error) {
      results.ethereum.error = `Ethereum mainnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    try {
      if (this.ethTestnetProvider) {
        const blockNumber = await this.ethTestnetProvider.getBlockNumber();
        results.ethereum.testnet = blockNumber > 0;
      }
    } catch (error) {
      results.ethereum.error = results.ethereum.error || `Ethereum testnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test Solana connectivity
    try {
      if (this.config.solana.rpcUrl) {
        // Basic connectivity test for Solana
        const response = await fetch(this.config.solana.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          })
        });
        results.solana.mainnet = response.ok;
      }
    } catch (error) {
      results.solana.error = `Solana mainnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    try {
      if (this.config.solana.testnetRpcUrl) {
        const response = await fetch(this.config.solana.testnetRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          })
        });
        results.solana.testnet = response.ok;
      }
    } catch (error) {
      results.solana.error = results.solana.error || `Solana testnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test Bitcoin connectivity  
    try {
      if (this.config.bitcoin.rpcUrl) {
        // Basic connectivity test for Bitcoin
        const response = await fetch(this.config.bitcoin.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '1.0',
            id: 1,
            method: 'getblockchaininfo',
            params: []
          })
        });
        results.bitcoin.mainnet = response.ok;
      }
    } catch (error) {
      results.bitcoin.error = `Bitcoin mainnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    try {
      if (this.config.bitcoin.testnetRpcUrl) {
        const response = await fetch(this.config.bitcoin.testnetRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '1.0',
            id: 1,
            method: 'getblockchaininfo',
            params: []
          })
        });
        results.bitcoin.testnet = response.ok;
      }
    } catch (error) {
      results.bitcoin.error = results.bitcoin.error || `Bitcoin testnet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return results;
  }

  /**
   * Generate a new wallet address for specified blockchain
   */
  async generateWallet(blockchain: 'ethereum' | 'solana' | 'bitcoin'): Promise<{
    address: string;
    privateKey: string;
    publicKey?: string;
    mnemonic?: string;
  }> {
    switch (blockchain) {
      case 'ethereum': {
        const wallet = ethers.Wallet.createRandom();
        return {
          address: wallet.address,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          mnemonic: wallet.mnemonic?.phrase,
        };
      }

      case 'solana': {
        // For now, return placeholder - would implement with @solana/web3.js
        return {
          address: 'solana-address-placeholder',
          privateKey: 'solana-private-key-placeholder',
          publicKey: 'solana-public-key-placeholder',
        };
      }

      case 'bitcoin': {
        // For now, return placeholder - would implement with bitcoinjs-lib
        return {
          address: 'bitcoin-address-placeholder',
          privateKey: 'bitcoin-private-key-placeholder',
        };
      }

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  /**
   * Get wallet balance for specified address and blockchain
   */
  async getWalletBalance(
    address: string,
    blockchain: 'ethereum' | 'solana' | 'bitcoin',
    network: 'mainnet' | 'testnet' = 'mainnet'
  ): Promise<WalletBalance> {
    switch (blockchain) {
      case 'ethereum': {
        const provider = network === 'mainnet' ? this.ethProvider : this.ethTestnetProvider;
        if (!provider) {
          throw new Error(`Ethereum ${network} provider not configured`);
        }

        const balance = await provider.getBalance(address);
        return {
          address,
          balance: ethers.formatEther(balance),
          currency: 'ETH',
          network,
        };
      }

      case 'solana': {
        // Placeholder implementation
        return {
          address,
          balance: '0.0',
          currency: 'SOL',
          network,
        };
      }

      case 'bitcoin': {
        // Placeholder implementation
        return {
          address,
          balance: '0.0',
          currency: 'BTC',
          network,
        };
      }

      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  /**
   * Validate blockchain configuration
   */
  validateConfiguration(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Ethereum configuration
    if (!this.config.ethereum.rpcUrl && !this.config.ethereum.testnetRpcUrl) {
      issues.push('No Ethereum RPC URLs configured');
    }
    if (this.config.ethereum.rpcUrl && this.config.ethereum.rpcUrl.includes('demo-project-id')) {
      recommendations.push('Update ETHEREUM_RPC_URL with actual Infura project ID');
    }

    // Check Solana configuration
    if (!this.config.solana.rpcUrl && !this.config.solana.testnetRpcUrl) {
      issues.push('No Solana RPC URLs configured');
    }

    // Check Bitcoin configuration
    if (!this.config.bitcoin.rpcUrl && !this.config.bitcoin.testnetRpcUrl) {
      issues.push('No Bitcoin RPC URLs configured');
    }

    // Security checks for production
    if (process.env.NODE_ENV === 'production') {
      if (this.config.ethereum.privateKey?.includes('placeholder')) {
        issues.push('Production Ethereum private key contains placeholder values');
      }
      if (this.config.solana.privateKey?.includes('placeholder')) {
        issues.push('Production Solana private key contains placeholder values');
      }
      if (this.config.bitcoin.privateKey?.includes('placeholder')) {
        issues.push('Production Bitcoin private key contains placeholder values');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get blockchain configuration summary
   */
  getConfigurationSummary(): {
    ethereum: { configured: boolean; networks: string[] };
    solana: { configured: boolean; networks: string[] };
    bitcoin: { configured: boolean; networks: string[] };
  } {
    return {
      ethereum: {
        configured: !!(this.config.ethereum.rpcUrl || this.config.ethereum.testnetRpcUrl),
        networks: [
          ...(this.config.ethereum.rpcUrl ? ['mainnet'] : []),
          ...(this.config.ethereum.testnetRpcUrl ? ['testnet'] : []),
        ],
      },
      solana: {
        configured: !!(this.config.solana.rpcUrl || this.config.solana.testnetRpcUrl),
        networks: [
          ...(this.config.solana.rpcUrl ? ['mainnet'] : []),
          ...(this.config.solana.testnetRpcUrl ? ['testnet'] : []),
        ],
      },
      bitcoin: {
        configured: !!(this.config.bitcoin.rpcUrl || this.config.bitcoin.testnetRpcUrl),
        networks: [
          ...(this.config.bitcoin.rpcUrl ? ['mainnet'] : []),
          ...(this.config.bitcoin.testnetRpcUrl ? ['testnet'] : []),
        ],
      },
    };
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();