'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WalletService, WalletTransaction } from '@/lib/walletService';
import { featureFlags } from '@/lib/featureFlags';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  // Await params in Next.js 15
  const { walletId } = await params;
  try {
    // Initialize feature flags
    await featureFlags.initialize();

    // Check if transactions API is enabled
    const isTransactionsEnabled = featureFlags.isEnabled('transactions_api', { defaultValue: true });
    if (!isTransactionsEnabled) {
      return NextResponse.json({ 
        success: false, 
        message: 'Transactions API is currently disabled' 
      }, { status: 503 });
    }
    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.transaction_type || !body.currency) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: amount, transaction_type, and currency are required' 
      }, { status: 400 });
    }
    
    // Validate transaction type
    const validTypes = ['deposit', 'withdrawal', 'transfer', 'payment', 'refund'];
    if (!validTypes.includes(body.transaction_type)) {
      return NextResponse.json({ 
        success: false, 
        message: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Create transaction
    const transactionParams: WalletTransaction = {
      amount: parseFloat(body.amount),
      currency: body.currency,
      transaction_type: body.transaction_type,
      description: body.description,
      reference_id: body.reference_id,
      metadata: body.metadata
    };
    
    const result = await WalletService.processTransaction(walletId, transactionParams);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Transaction processed successfully',
      data: {
        wallet: result.wallet,
        transactionId: result.transactionId
      }
    });
    
  } catch (error: any) {
    console.error(`Error processing transaction for wallet ${walletId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to process transaction' 
    }, { status: 500 });
  }
}