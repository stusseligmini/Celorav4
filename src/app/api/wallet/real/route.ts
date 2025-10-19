/**
 * REAL WALLET API ROUTE
 * Temporarily disabled for QuikNode Solana integration testing
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Real wallet service temporarily disabled', 
      message: 'QuikNode Solana endpoints are being integrated. Check back soon!',
      status: 'QuikNode integration in progress'
    },
    { status: 503 }
  );
}

/*
// import { RealBlockchainWalletService } from '@/lib/services/realBlockchainWalletService';
import { supabaseServer } from '@/lib/supabase/server';

// const walletService = new RealBlockchainWalletService();

async function createWalletDisabled(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'create_wallet':
        return await createWallet(params);
      case 'get_balance':
        return await getBalance(params);
      case 'send_transaction':
        return await sendTransaction(params);
      case 'get_transactions':
        return await getTransactions(params);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createWallet(params: {
  userId: string;
  type: 'ethereum' | 'solana' | 'bitcoin';
  name: string;
  network?: 'mainnet' | 'testnet';
}) {
  try {
    const wallet = await walletService.createRealWallet(
      params.userId,
      params.type,
      params.name,
      params.network || 'mainnet'
    );

    return NextResponse.json({
      success: true,
      data: {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        address: wallet.address,
        network: wallet.network,
        balance: wallet.balance,
        balanceUSD: wallet.balanceUSD,
        createdAt: wallet.createdAt
      },
      message: `${params.type} wallet created successfully`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

async function getBalance(params: { walletId: string }) {
  try {
    await walletService.updateWalletBalances(params.walletId);
    
    const { data: wallet } = await supabaseServer
      .from('wallets')
      .select('balance, balance_usd, currency, address, type, network')
      .eq('id', params.walletId)
      .single() as { data: any };

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        balanceUSD: wallet.balance_usd,
        currency: wallet.currency,
        address: wallet.address,
        type: wallet.type,
        network: wallet.network
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

async function sendTransaction(params: {
  walletId: string;
  toAddress: string;
  amount: string;
  gasPrice?: string;
}) {
  try {
    const transaction = await walletService.sendTransaction(
      params.walletId,
      params.toAddress,
      params.amount,
      params.gasPrice
    );

    // Start monitoring the transaction
    setTimeout(() => {
      walletService.monitorTransaction(transaction.id);
    }, 10000); // Check after 10 seconds

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction submitted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

async function getTransactions(params: {
  walletId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const { data: transactions } = await supabaseServer
      .from('transactions')
      .select('*')
      .eq('wallet_id', params.walletId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1) as { data: any[] };

    return NextResponse.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx.id,
        txHash: tx.tx_hash,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        toAddress: tx.to_address,
        fromAddress: tx.from_address,
        status: tx.status,
        blockNumber: tx.block_number,
        fee: tx.fee,
        createdAt: tx.created_at,
        confirmedAt: tx.confirmed_at
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    const { data: wallets } = await supabaseServer
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as { data: any[] };

    return NextResponse.json({
      success: true,
      data: wallets.map(wallet => ({
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        address: wallet.address,
        network: wallet.network,
        balance: wallet.balance,
        balanceUSD: wallet.balance_usd,
        currency: wallet.currency,
        isPrimary: wallet.is_primary,
        createdAt: wallet.created_at
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}
*/