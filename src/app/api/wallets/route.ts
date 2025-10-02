import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { name, currency, isPrimary } = await request.json();
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create wallet
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: session.user.id,
        address: `celora_${session.user.id.slice(0, 8)}_${Date.now()}`, // Generate a unique address
        blockchain: 'solana', // Default to solana
        balance: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wallet:', error);
      return NextResponse.json({ 
        error: 'Failed to create wallet', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ wallet: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's wallets
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }

    return NextResponse.json({ wallets: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
