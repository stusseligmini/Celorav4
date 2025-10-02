import { NextRequest, NextResponse } from 'next/server';
import { multiCurrency } from '@/lib/multiCurrency';
import { featureFlags } from '@/lib/featureFlags';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/exchange-rates - Get current exchange rates
export async function GET(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if real-time rates are enabled
    const isEnabled = featureFlags.isEnabled('real_time_rates', { defaultValue: true });
    if (!isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Real-time exchange rates are disabled' },
        { status: 403 }
      );
    }

    // Initialize multi-currency system
    await multiCurrency.initialize();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const baseCurrency = searchParams.get('base'); // Base currency (e.g., USD)
    const targetCurrency = searchParams.get('target'); // Target currency (e.g., EUR)
    
    // If specific currencies requested
    if (baseCurrency && targetCurrency) {
      const rate = multiCurrency.getExchangeRate(baseCurrency, targetCurrency);
      
      if (rate === null) {
        return NextResponse.json(
          { success: false, error: `No exchange rate found for ${baseCurrency} to ${targetCurrency}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          baseCurrency: baseCurrency.toUpperCase(),
          targetCurrency: targetCurrency.toUpperCase(),
          rate,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get all supported currencies for rate matrix
    const currencies = multiCurrency.getSupportedCurrencies();
    const rates: Record<string, Record<string, number | null>> = {};

    // Build rate matrix
    currencies.forEach(fromCurrency => {
      rates[fromCurrency.code] = {};
      currencies.forEach(toCurrency => {
        if (fromCurrency.code === toCurrency.code) {
          rates[fromCurrency.code][toCurrency.code] = 1;
        } else {
          rates[fromCurrency.code][toCurrency.code] = multiCurrency.getExchangeRate(
            fromCurrency.code, 
            toCurrency.code
          );
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        rates,
        currencies: currencies.map(c => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          type: c.type
        })),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/exchange-rates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

// POST /api/exchange-rates/update - Manually trigger rate update (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if rate updates are enabled
    const isEnabled = featureFlags.isEnabled('exchange_rate_updates', { defaultValue: true });
    if (!isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Exchange rate updates are disabled' },
        { status: 403 }
      );
    }

    // Initialize multi-currency system
    await multiCurrency.initialize();

    // This would typically trigger external API calls to update rates
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Exchange rate update triggered',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in POST /api/exchange-rates/update:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
}
