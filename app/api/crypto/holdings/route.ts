import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      crypto_symbol, 
      amount, 
      purchase_price, 
      current_price,
      exchange = 'internal'
    } = await request.json();

    if (!crypto_symbol || !amount || !purchase_price) {
      return NextResponse.json({ 
        error: 'Missing required fields: crypto_symbol, amount, purchase_price' 
      }, { status: 400 });
    }

    // Check if holding already exists
    const { data: existingHolding } = await supabase
      .from('crypto_holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('crypto_symbol', crypto_symbol.toUpperCase())
      .single();

    let holdingData;

    if (existingHolding) {
      // Update existing holding (average cost)
      const totalAmount = existingHolding.amount + amount;
      const avgPrice = ((existingHolding.average_cost * existingHolding.amount) + 
                       (purchase_price * amount)) / totalAmount;

      const { data: updatedHolding, error } = await supabase
        .from('crypto_holdings')
        .update({
          amount: totalAmount,
          average_cost: avgPrice,
          current_price: current_price || purchase_price,
          last_updated: new Date().toISOString()
        })
        .eq('id', existingHolding.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      holdingData = updatedHolding;
    } else {
      // Create new holding
      const { data: newHolding, error } = await supabase
        .from('crypto_holdings')
        .insert({
          user_id: user.id,
          crypto_symbol: crypto_symbol.toUpperCase(),
          amount,
          average_cost: purchase_price,
          current_price: current_price || purchase_price,
          exchange
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      holdingData = newHolding;
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: purchase_price * amount,
        currency: 'USD',
        type: 'crypto_purchase',
        status: 'completed',
        description: `Purchased ${amount} ${crypto_symbol.toUpperCase()}`,
        metadata: {
          crypto_symbol: crypto_symbol.toUpperCase(),
          crypto_amount: amount,
          crypto_price: purchase_price,
          exchange
        }
      });

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
    }

    return NextResponse.json({
      success: true,
      holding: holdingData,
      message: 'Crypto holding updated successfully'
    });

  } catch (error) {
    console.error('Crypto holding creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's crypto holdings
    const { data: holdings, error } = await supabase
      .from('crypto_holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate portfolio metrics
    let totalValue = 0;
    let totalCost = 0;
    
    const portfolioData = holdings?.map(holding => {
      const currentValue = holding.amount * (holding.current_price || holding.average_cost);
      const costBasis = holding.amount * holding.average_cost;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      totalValue += currentValue;
      totalCost += costBasis;

      return {
        ...holding,
        current_value: currentValue,
        cost_basis: costBasis,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent
      };
    }) || [];

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return NextResponse.json({
      success: true,
      holdings: portfolioData,
      portfolio: {
        total_value: totalValue,
        total_cost: totalCost,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent,
        holding_count: portfolioData.length
      }
    });

  } catch (error) {
    console.error('Crypto holdings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}