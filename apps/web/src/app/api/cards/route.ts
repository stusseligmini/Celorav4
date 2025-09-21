import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { cardType, currency, spendingLimit, pin } = await request.json();
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hash the PIN for security
    let pinHash = null;
    if (pin) {
      pinHash = await hash(pin, 12);
    }

    // Generate a masked PAN (in production, this would be a real card number)
    const maskedPan = `**** **** **** ${Math.floor(1000 + Math.random() * 9000)}`;

    // Create virtual card
    const { data, error } = await supabase
      .from('virtual_cards')
      .insert({
        user_id: session.user.id,
        masked_pan: maskedPan,
        balance: 0,
        currency: currency || 'USD',
        spending_limit: spendingLimit || 1000,
        status: 'active',
        pin_hash: pinHash
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
    }

    // Remove sensitive data from response
    const { pin_hash, ...cardData } = data;

    return NextResponse.json({ card: cardData });
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

    // Get user's cards (excluding sensitive data)
    const { data, error } = await supabase
      .from('virtual_cards')
      .select('id, user_id, masked_pan, balance, currency, spending_limit, status, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    return NextResponse.json({ cards: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}