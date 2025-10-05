import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { wallet_name, wallet_type, network, currency } = await request.json();
    
    // Get auth token from headers
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }
    
    const token = authorization.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Validate required fields
    if (!wallet_name || !wallet_type || !network) {
      return NextResponse.json({ 
        error: 'Missing required fields: wallet_name, wallet_type, network' 
      }, { status: 400 });
    }

    // Generate public key (mock for now - will be real crypto generation later)
    const public_key = `${wallet_type}_${user.id.slice(0, 8)}_${Date.now()}`;
    
    // Create wallet with unified schema fields
    const { data, error } = await (supabaseServer as any)
      .from('wallets')
      .insert({
        user_id: user.id,
        wallet_name,
        wallet_type,
        public_key,
        network,
        currency: currency || 'USD',
        balance: 0,
        usd_balance: 0,
        is_primary: false,
        is_active: true
      } as any)
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
    // Get auth token from headers
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }
    
    const token = authorization.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get user's wallets using unified schema
    const { data, error } = await (supabaseServer as any)
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }

    return NextResponse.json({ wallets: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
