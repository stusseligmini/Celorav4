import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

/**
 * SOLANA WEBSOCKET STREAMING SERVICE
 * Real-time monitoring of Solana transactions and account changes
 * Connects to QuikNode WebSocket endpoints for live data
 */

interface WebSocketMessage {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: number;
}

interface AccountSubscription {
  user_id: string;
  wallet_address: string;
  subscription_id?: number;
  subscription_type: 'account' | 'program' | 'logs' | 'signature';
}

interface TransactionData {
  signature: string;
  slot: number;
  blockTime?: number;
  meta: {
    fee: number;
    preBalances: number[];
    postBalances: number[];
    err?: any;
  };
  transaction: {
    message: {
      accountKeys: string[];
      instructions: any[];
    };
    signatures: string[];
  };
}

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SOLANA_WSS_URL = Deno.env.get('SOLANA_WSS_URL') || 'wss://api.mainnet-beta.solana.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class SolanaWebSocketStream {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, AccountSubscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      console.log(`🔌 Connecting to Solana WebSocket: ${SOLANA_WSS_URL}`);
      
      this.ws = new WebSocket(SOLANA_WSS_URL);
      
      this.ws.onopen = () => {
        console.log('✅ Connected to Solana WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Restore existing subscriptions
        this.restoreSubscriptions();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('❌ Solana WebSocket disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🚨 Solana WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('🚨 Failed to connect to Solana WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      
      console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Maximum reconnection attempts reached. Giving up.');
    }
  }

  private async restoreSubscriptions() {
    // Get active subscriptions from database
    const { data: activeSubscriptions, error } = await supabase
      .from('websocket_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching active subscriptions:', error);
      return;
    }

    console.log(`🔄 Restoring ${activeSubscriptions?.length || 0} subscriptions`);
    
    for (const sub of activeSubscriptions || []) {
      await this.subscribeToAccount(sub.user_id, sub.wallet_address, sub.subscription_type);
    }
  }

  private async handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      
      if (message.method === 'accountNotification') {
        await this.handleAccountNotification(message.params);
      } else if (message.method === 'signatureNotification') {
        await this.handleSignatureNotification(message.params);
      } else if (message.method === 'logsNotification') {
        await this.handleLogsNotification(message.params);
      } else if (message.result) {
        // Subscription confirmation
        console.log('✅ Subscription confirmed:', message);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  private async handleAccountNotification(params: any) {
    const { result, subscription } = params;
    
    if (!result || !result.context || !result.value) {
      return;
    }

    const accountKey = result.value.owner || 'unknown';
    const lamports = result.value.lamports || 0;
    
    console.log(`💰 Account notification - Lamports: ${lamports}, Owner: ${accountKey}`);

    // Store account change in database
    const { error } = await supabase
      .from('solana_transaction_stream')
      .insert({
        signature: `account_change_${Date.now()}`,
        wallet_address: accountKey,
        block_time: Math.floor(Date.now() / 1000),
        slot: result.context.slot,
        transaction_type: 'transfer',
        amount: lamports / 1e9, // Convert lamports to SOL
        success: true,
        raw_transaction: {
          type: 'account_notification',
          data: result
        }
      });

    if (error) {
      console.error('❌ Error storing account notification:', error);
    }
  }

  private async handleSignatureNotification(params: any) {
    const { result, subscription } = params;
    
    if (!result || !result.context) {
      return;
    }

    console.log('📝 Signature notification:', result);

    // Fetch full transaction details
    if (result.value && result.value !== null) {
      const signature = result.value.signature || 'unknown';
      
      // Get transaction details from RPC
      await this.fetchAndStoreTransaction(signature);
    }
  }

  private async handleLogsNotification(params: any) {
    const { result, subscription } = params;
    
    if (!result || !result.value) {
      return;
    }

    console.log('📋 Logs notification:', result.value);

    const signature = result.value.signature;
    if (signature) {
      await this.fetchAndStoreTransaction(signature);
    }
  }

  private async fetchAndStoreTransaction(signature: string) {
    try {
      // Fetch transaction details from Solana RPC
      const rpcResponse = await fetch(SOLANA_WSS_URL.replace('wss://', 'https://'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            signature,
            {
              encoding: 'json',
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          ]
        })
      });

      if (!rpcResponse.ok) {
        throw new Error(`RPC request failed: ${rpcResponse.status}`);
      }

      const rpcData = await rpcResponse.json();
      
      if (rpcData.error) {
        console.error('RPC error:', rpcData.error);
        return;
      }

      const txData: TransactionData = rpcData.result;
      
      if (!txData) {
        console.warn(`Transaction not found: ${signature}`);
        return;
      }

      // Parse transaction data
      const accountKeys = txData.transaction.message.accountKeys;
      const fee = txData.meta.fee / 1e9; // Convert to SOL
      const preBalances = txData.meta.preBalances;
      const postBalances = txData.meta.postBalances;
      
      // Determine transaction type and amounts
      let transactionType = 'unknown';
      let amount = 0;
      let fromAddress = '';
      let toAddress = '';

      // Calculate balance changes
      for (let i = 0; i < accountKeys.length; i++) {
        const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;
        
        if (balanceChange > 0) {
          // This account received SOL
          toAddress = accountKeys[i];
          amount = balanceChange;
          transactionType = 'transfer';
        } else if (balanceChange < 0 && Math.abs(balanceChange) > fee) {
          // This account sent SOL (excluding fees)
          fromAddress = accountKeys[i];
          if (amount === 0) {
            amount = Math.abs(balanceChange) - fee;
          }
          transactionType = 'transfer';
        }
      }

      // Store transaction in database
      const { error } = await supabase
        .from('solana_transaction_stream')
        .insert({
          signature,
          wallet_address: fromAddress || toAddress || accountKeys[0],
          block_time: txData.blockTime,
          slot: txData.slot,
          transaction_type: transactionType,
          amount,
          from_address: fromAddress || null,
          to_address: toAddress || null,
          fee,
          success: !txData.meta.err,
          error_message: txData.meta.err ? JSON.stringify(txData.meta.err) : null,
          raw_transaction: txData
        });

      if (error) {
        console.error('❌ Error storing transaction:', error);
      } else {
        console.log(`✅ Stored transaction: ${signature} (${amount} SOL)`);
        
        // Trigger auto-link process
        await this.triggerAutoLink(signature, fromAddress || toAddress || accountKeys[0], amount);
      }

    } catch (error) {
      console.error('❌ Error fetching transaction details:', error);
    }
  }

  private async triggerAutoLink(signature: string, walletAddress: string, amount: number) {
    // Create pending transfer link for auto-linking system
    const { error } = await supabase
      .from('pending_transfer_links')
      .insert({
        signature,
        wallet_address: walletAddress,
        amount,
        transfer_type: amount > 0 ? 'incoming' : 'outgoing',
        confidence_score: 0.7, // Initial confidence
        auto_link_status: 'pending'
      });

    if (error) {
      console.error('❌ Error creating pending transfer link:', error);
    } else {
      console.log(`🔗 Created pending transfer link for ${walletAddress}`);
    }
  }

  public async subscribeToAccount(userId: string, accountAddress: string, subscriptionType: 'account' | 'program' | 'logs' | 'signature' = 'account') {
    if (!this.isConnected) {
      console.warn('⚠️ WebSocket not connected, queueing subscription');
      return;
    }

    const subscriptionKey = `${userId}:${accountAddress}:${subscriptionType}`;
    
    if (this.subscriptions.has(subscriptionKey)) {
      console.log(`ℹ️ Already subscribed to ${subscriptionKey}`);
      return;
    }

    let method: string;
    let params: any[];

    switch (subscriptionType) {
      case 'account':
        method = 'accountSubscribe';
        params = [accountAddress, { encoding: 'base64', commitment: 'confirmed' }];
        break;
      case 'logs':
        method = 'logsSubscribe';
        params = [{ mentions: [accountAddress] }, { commitment: 'confirmed' }];
        break;
      case 'signature':
        method = 'signatureSubscribe';
        params = [accountAddress, { commitment: 'confirmed' }];
        break;
      default:
        console.error(`❌ Unsupported subscription type: ${subscriptionType}`);
        return;
    }

    const message: WebSocketMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    try {
      this.ws?.send(JSON.stringify(message));
      
      // Store subscription info
      this.subscriptions.set(subscriptionKey, {
        user_id: userId,
        wallet_address: accountAddress,
        subscription_type: subscriptionType
      });

      // Update database
      await supabase
        .from('websocket_subscriptions')
        .upsert({
          user_id: userId,
          wallet_address: accountAddress,
          subscription_type: subscriptionType,
          is_active: true,
          last_notification_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,wallet_address,subscription_type'
        });

      console.log(`✅ Subscribed to ${subscriptionType} for ${accountAddress}`);
      
    } catch (error) {
      console.error('❌ Error subscribing to account:', error);
    }
  }

  public async unsubscribeFromAccount(userId: string, accountAddress: string, subscriptionType: string = 'account') {
    const subscriptionKey = `${userId}:${accountAddress}:${subscriptionType}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    
    if (!subscription || !subscription.subscription_id) {
      console.warn(`⚠️ No active subscription found for ${subscriptionKey}`);
      return;
    }

    const method = subscriptionType === 'account' ? 'accountUnsubscribe' : 
                   subscriptionType === 'logs' ? 'logsUnsubscribe' : 
                   'signatureUnsubscribe';

    const message: WebSocketMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: [subscription.subscription_id]
    };

    try {
      this.ws?.send(JSON.stringify(message));
      this.subscriptions.delete(subscriptionKey);

      // Update database
      await supabase
        .from('websocket_subscriptions')
        .update({ is_active: false })
        .match({
          user_id: userId,
          wallet_address: accountAddress,
          subscription_type: subscriptionType
        });

      console.log(`✅ Unsubscribed from ${subscriptionType} for ${accountAddress}`);
      
    } catch (error) {
      console.error('❌ Error unsubscribing from account:', error);
    }
  }
}

// Global WebSocket stream instance
let wsStream: SolanaWebSocketStream | null = null;

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const method = req.method;

    // Initialize WebSocket stream if not exists
    if (!wsStream) {
      wsStream = new SolanaWebSocketStream();
    }

    if (method === 'POST' && url.pathname === '/solana-websocket-stream') {
      const { action, user_id, wallet_address, subscription_type } = await req.json();

      switch (action) {
        case 'subscribe':
          await wsStream.subscribeToAccount(user_id, wallet_address, subscription_type);
          return new Response(JSON.stringify({
            success: true,
            message: `Subscribed to ${subscription_type} for ${wallet_address}`
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });

        case 'unsubscribe':
          await wsStream.unsubscribeFromAccount(user_id, wallet_address, subscription_type);
          return new Response(JSON.stringify({
            success: true,
            message: `Unsubscribed from ${subscription_type} for ${wallet_address}`
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });

        case 'status':
          return new Response(JSON.stringify({
            success: true,
            connected: wsStream ? true : false,
            subscriptions: wsStream ? wsStream['subscriptions'].size : 0
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });

        default:
          return new Response(JSON.stringify({
            error: 'Invalid action. Use: subscribe, unsubscribe, or status'
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400
          });
      }
    }

    return new Response(JSON.stringify({
      message: 'Solana WebSocket Streaming Service',
      endpoints: {
        'POST /solana-websocket-stream': {
          actions: ['subscribe', 'unsubscribe', 'status'],
          params: {
            user_id: 'string',
            wallet_address: 'string (Solana address)',
            subscription_type: 'account|logs|signature'
          }
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});