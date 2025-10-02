import { NextRequest, NextResponse } from 'next/server';
import { multiCurrency } from '@/lib/multiCurrency';
import { featureFlags } from '@/lib/featureFlags';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/currencies - Get supported currencies
export async function GET(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if multi-currency is enabled
    const isEnabled = featureFlags.isEnabled('multi_currency', { defaultValue: true });
    if (!isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Multi-currency support is disabled' },
        { status: 403 }
      );
    }

    // Initialize multi-currency system
    await multiCurrency.initialize();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'fiat', 'crypto', or null for all
    const active = searchParams.get('active'); // 'true', 'false', or null for all

    // Get all supported currencies
    let currencies = multiCurrency.getSupportedCurrencies();

    // Apply filters
    if (type) {
      currencies = currencies.filter(c => c.type === type);
    }
    
    if (active !== null) {
      const isActive = active === 'true';
      currencies = currencies.filter(c => c.isActive === isActive);
    }

    return NextResponse.json({
      success: true,
      data: {
        currencies,
        count: currencies.length,
        filters: {
          type: type || 'all',
          active: active || 'all'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in GET /api/currencies:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
};

// POST /api/currencies/convert - Convert currency amounts
export async function POST(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if currency conversion is enabled
    const isConversionEnabled = featureFlags.isEnabled('currency_conversion', { defaultValue: true });
    if (!isConversionEnabled) {
      return NextResponse.json(
        { success: false, error: 'Currency conversion is disabled' },
        { status: 403 }
      );
    }

    // Get authenticated user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize multi-currency system
    await multiCurrency.initialize();

    // Parse request body
    const body = await request.json();
    const { amount, fromCurrency, toCurrency, includeFee = false } = body;

    // Validate required fields
    if (!amount || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, fromCurrency, toCurrency' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate currencies
    const fromCurrencyInfo = multiCurrency.getCurrency(fromCurrency);
    const toCurrencyInfo = multiCurrency.getCurrency(toCurrency);

    if (!fromCurrencyInfo) {
      return NextResponse.json(
        { success: false, error: `Unsupported currency: ${fromCurrency}` },
        { status: 400 }
      );
    }

    if (!toCurrencyInfo) {
      return NextResponse.json(
        { success: false, error: `Unsupported currency: ${toCurrency}` },
        { status: 400 }
      );
    }

    // Perform conversion
    const conversion = await multiCurrency.convertCurrency(
      amount,
      fromCurrency,
      toCurrency,
      includeFee
    );

    if (!conversion) {
      return NextResponse.json(
        { success: false, error: 'Currency conversion failed - no exchange rate available' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        conversion,
        exchangeRate: multiCurrency.getExchangeRate(fromCurrency, toCurrency)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in POST /api/currencies/convert:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Currency conversion failed' },
      { status: 500 }
    );
  }
};
