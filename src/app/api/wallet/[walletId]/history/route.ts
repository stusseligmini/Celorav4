import { NextRequest, NextResponse } from 'next/server';
import { featureFlags } from '@/lib/featureFlags';
import { walletCache } from '@/server/walletCache';

// Define a simplified route handler with minimal typing
export async function GET(
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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ 
        success: false, 
        message: 'Limit must be between 1 and 100' 
      }, { status: 400 });
    }
    
    if (offset < 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Offset must be greater than or equal to 0' 
      }, { status: 400 });
    }
    
    // Get transaction history from cache
    const transactions = await walletCache.getTransactionHistory(walletId, limit, offset);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        transactions,
        pagination: {
          limit,
          offset,
          count: transactions.length
        }
      }
    });
    
  } catch (error: any) {
    console.error(`Error retrieving transaction history for wallet ${walletId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve transaction history' 
    }, { status: 500 });
  }
}