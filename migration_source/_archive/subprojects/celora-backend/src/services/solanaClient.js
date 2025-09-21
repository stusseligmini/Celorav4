/**
 * Celora High-Performance Solana Client
 * Optimized for speed, reliability, and production trading
 * 
 * PRODUCTION REQUIREMENTS:
 * - Use dedicated Solana RPC endpoints (QuickNode, Helius, Triton) for guaranteed throughput
 * - Implement proper private key management with HSM or secure key storage
 * - Add comprehensive error handling and retry logic for network issues
 * - Monitor RPC rate limits and implement connection pooling
 * - Use priority fees for faster transaction confirmation
 */

const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const logger = require('../utils/logger');

class SolanaClient {
  constructor() {
    this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(this.rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false
    });
    
    // Connection pool for high throughput
    this.connectionPool = [];
    this.poolSize = 3;
    this.currentConnectionIndex = 0;
    
    // Rate limiting and retry configuration
    this.rateLimits = {
      requestsPerSecond: 40, // Conservative for public RPC
      maxRetries: 3,
      retryDelayMs: 1000
    };
    
    // Request tracking for rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    
    // Market-making and trading constants
    this.PRIORITY_FEE = 5000; // Micro-lamports for faster confirmation
    this.MAX_SLIPPAGE = 0.005; // 0.5% max slippage
    
    this.initializeConnectionPool();
    this.startHealthMonitoring();
    
    logger.info(`🔗 Solana client initialized: ${this.rpcUrl}`);
  }
  
  initializeConnectionPool() {
    for (let i = 0; i < this.poolSize; i++) {
      this.connectionPool.push(new Connection(this.rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000
      }));
    }
  }
  
  getConnection() {
    // Round-robin connection selection for load balancing
    const connection = this.connectionPool[this.currentConnectionIndex];
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.poolSize;
    return connection;
  }
  
  async startHealthMonitoring() {
    // Monitor RPC health every 30 seconds
    setInterval(async () => {
      try {
        const slot = await this.connection.getSlot();
        logger.debug(`🟢 Solana RPC healthy - Current slot: ${slot}`);
      } catch (error) {
        logger.error('🔴 Solana RPC health check failed:', error);
      }
    }, 30000);
  }
  
  /**
   * Rate-limited RPC request wrapper
   */
  async rpcRequest(method, ...args) {
    // Simple rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < 1000 / this.rateLimits.requestsPerSecond) {
      const delay = (1000 / this.rateLimits.requestsPerSecond) - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
    
    // Execute with retry logic
    for (let attempt = 1; attempt <= this.rateLimits.maxRetries; attempt++) {
      try {
        const connection = this.getConnection();
        return await connection[method](...args);
      } catch (error) {
        if (attempt === this.rateLimits.maxRetries) {
          throw error;
        }
        
        logger.warn(`🔄 RPC request failed (attempt ${attempt}/${this.rateLimits.maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, this.rateLimits.retryDelayMs * attempt));
      }
    }
  }
  
  /**
   * Get SOL balance for an address
   */
  async getBalance(address) {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.rpcRequest('getBalance', publicKey);
      return {
        address,
        balance: balance / LAMPORTS_PER_SOL,
        lamports: balance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Failed to get balance for ${address}:`, error);
      throw error;
    }
  }
  
  /**
   * Get SPL token balance
   */
  async getTokenBalance(walletAddress, tokenMintAddress) {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);
      
      // Get associated token account
      const tokenAccounts = await this.rpcRequest('getTokenAccountsByOwner', walletPublicKey, {
        mint: tokenMintPublicKey
      });
      
      if (tokenAccounts.value.length === 0) {
        return {
          address: walletAddress,
          mint: tokenMintAddress,
          balance: 0,
          decimals: 0,
          timestamp: new Date().toISOString()
        };
      }
      
      const tokenAccount = tokenAccounts.value[0];
      const balance = await this.rpcRequest('getTokenAccountBalance', tokenAccount.pubkey);
      
      return {
        address: walletAddress,
        mint: tokenMintAddress,
        tokenAccount: tokenAccount.pubkey.toString(),
        balance: parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals),
        decimals: balance.value.decimals,
        uiAmount: balance.value.uiAmount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Failed to get token balance:`, error);
      throw error;
    }
  }
  
  /**
   * Get current slot and block time for transaction ordering
   */
  async getNetworkInfo() {
    try {
      const [slot, blockTime, epoch] = await Promise.all([
        this.rpcRequest('getSlot'),
        this.rpcRequest('getBlockTime', await this.rpcRequest('getSlot')),
        this.rpcRequest('getEpochInfo')
      ]);
      
      return {
        slot,
        blockTime,
        epoch: epoch.epoch,
        slotIndex: epoch.slotIndex,
        slotsInEpoch: epoch.slotsInEpoch,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('❌ Failed to get network info:', error);
      throw error;
    }
  }
  
  /**
   * Estimate transaction fees including priority fees
   */
  async estimateTransactionFee(transaction, priorityFee = this.PRIORITY_FEE) {
    try {
      const { feeCalculator } = await this.rpcRequest('getRecentBlockhash');
      const baseFee = feeCalculator.lamportsPerSignature;
      const totalFee = baseFee + priorityFee;
      
      return {
        baseFee,
        priorityFee,
        totalFee,
        totalFeeSol: totalFee / LAMPORTS_PER_SOL
      };
    } catch (error) {
      logger.error('❌ Fee estimation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create and send SOL transfer transaction
   * WARNING: This is a MOCK implementation for development
   * PRODUCTION: Implement proper key management with HSM
   */
  async mockTransferSol(fromAddress, toAddress, amount) {
    try {
      // MOCK IMPLEMENTATION - DO NOT USE IN PRODUCTION
      logger.warn('⚠️  MOCK SOL TRANSFER - NOT EXECUTING REAL TRANSACTION');
      
      const mockTransactionSignature = 'mock_' + Math.random().toString(36).substring(2, 15);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult = {
        signature: mockTransactionSignature,
        from: fromAddress,
        to: toAddress,
        amount,
        status: 'confirmed',
        slot: await this.rpcRequest('getSlot'),
        timestamp: new Date().toISOString(),
        fee: 0.000005,
        confirmations: 31
      };
      
      logger.info(`💸 Mock SOL transfer: ${amount} SOL from ${fromAddress} to ${toAddress}`, mockResult);
      
      return mockResult;
    } catch (error) {
      logger.error('❌ Mock SOL transfer failed:', error);
      throw error;
    }
  }
  
  /**
   * Create and send SPL token transfer
   * WARNING: This is a MOCK implementation for development
   */
  async mockTransferToken(fromAddress, toAddress, tokenMint, amount) {
    try {
      logger.warn('⚠️  MOCK TOKEN TRANSFER - NOT EXECUTING REAL TRANSACTION');
      
      const mockTransactionSignature = 'mock_token_' + Math.random().toString(36).substring(2, 15);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult = {
        signature: mockTransactionSignature,
        from: fromAddress,
        to: toAddress,
        mint: tokenMint,
        amount,
        status: 'confirmed',
        slot: await this.rpcRequest('getSlot'),
        timestamp: new Date().toISOString(),
        fee: 0.000005
      };
      
      logger.info(`🪙 Mock token transfer: ${amount} tokens (${tokenMint}) from ${fromAddress} to ${toAddress}`, mockResult);
      
      return mockResult;
    } catch (error) {
      logger.error('❌ Mock token transfer failed:', error);
      throw error;
    }
  }
  
  /**
   * Monitor transaction status until confirmation
   */
  async confirmTransaction(signature, maxAttempts = 30) {
    try {
      logger.info(`⏳ Monitoring transaction: ${signature}`);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const status = await this.rpcRequest('getSignatureStatus', signature);
        
        if (status && status.value) {
          const { confirmationStatus, err } = status.value;
          
          if (err) {
            throw new Error(`Transaction failed: ${JSON.stringify(err)}`);
          }
          
          if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
            logger.info(`✅ Transaction confirmed: ${signature} (${confirmationStatus})`);
            return {
              signature,
              status: confirmationStatus,
              slot: status.value.slot,
              confirmations: status.value.confirmations,
              timestamp: new Date().toISOString()
            };
          }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      throw new Error(`Transaction confirmation timeout: ${signature}`);
    } catch (error) {
      logger.error(`❌ Transaction monitoring failed:`, error);
      throw error;
    }
  }
  
  /**
   * Get account info for debugging and verification
   */
  async getAccountInfo(address) {
    try {
      const publicKey = new PublicKey(address);
      const accountInfo = await this.rpcRequest('getAccountInfo', publicKey);
      
      return {
        address,
        exists: accountInfo !== null,
        lamports: accountInfo?.lamports || 0,
        owner: accountInfo?.owner?.toString() || null,
        executable: accountInfo?.executable || false,
        rentEpoch: accountInfo?.rentEpoch || null,
        dataLength: accountInfo?.data?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Failed to get account info for ${address}:`, error);
      throw error;
    }
  }
  
  /**
   * Health check method for monitoring
   */
  async healthCheck() {
    try {
      const start = Date.now();
      const slot = await this.rpcRequest('getSlot');
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        rpcUrl: this.rpcUrl,
        currentSlot: slot,
        latency: `${latency}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
const solanaClient = new SolanaClient();
module.exports = solanaClient;
