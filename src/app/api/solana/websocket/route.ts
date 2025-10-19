import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * SOLANA WEBSOCKET STREAMING API
 * Frontend interface to manage WebSocket subscriptions for real-time Solana monitoring
 */

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, wallet_address, subscription_type = 'account' } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('solana-websocket-stream', {
      body: {
        action,
        user_id: user.id,
        wallet_address,
        subscription_type
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      return NextResponse.json(
        { error: 'Failed to call WebSocket service', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('WebSocket API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const userId = user.id;
    const wallet_address = url.searchParams.get('wallet_address');

    // Get user's active subscriptions
    let query = supabase
      .from('websocket_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (wallet_address) {
      query = query.eq('wallet_address', wallet_address);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Also get recent transaction stream data for subscribed wallets
    const walletAddresses = subscriptions?.map(sub => sub.wallet_address) || [];
    
    let recentTransactions: any[] = [];
    if (walletAddresses.length > 0) {
      const { data: txData } = await supabase
        .from('solana_transaction_stream')
        .select('*')
        .in('wallet_address', walletAddresses)
        .order('processed_at', { ascending: false })
        .limit(20);

      recentTransactions = txData || [];
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptions || [],
        recent_transactions: recentTransactions,
        wallet_count: new Set(walletAddresses).size
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WebSocket API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}