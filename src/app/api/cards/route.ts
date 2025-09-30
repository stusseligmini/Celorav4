import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { hash } from 'bcryptjs';
import { 
  ApiResponseHelper, 
  RequestValidator, 
  HttpStatusCode,
  type StaticRouteHandler 
} from '@/types/api';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const POST: StaticRouteHandler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { cardType, currency, spendingLimit, pin } = body;
    
    // Validate required fields
    const requiredFieldErrors = RequestValidator.validateRequired(
      { cardType, currency },
      ['cardType', 'currency']
    );
    
    if (requiredFieldErrors.length > 0) {
      return NextResponse.json(
        ApiResponseHelper.error(
          'Missing required fields',
          'VALIDATION_ERROR',
          { errors: requiredFieldErrors }
        ),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        ApiResponseHelper.error('Authentication required', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
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
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      return NextResponse.json(
        ApiResponseHelper.error(
          'Failed to create card',
          'DATABASE_ERROR',
          process.env.NODE_ENV === 'development' ? { details: error.message } : undefined
        ),
        { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      ApiResponseHelper.success(data, 'Virtual card created successfully'),
      { status: HttpStatusCode.CREATED }
    );
    
  } catch (error: any) {
    console.error('API error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid JSON in request body', 'INVALID_JSON'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    return NextResponse.json(
      ApiResponseHelper.error(
        'Internal server error',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
      ),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};

export const GET: StaticRouteHandler = async (request: NextRequest) => {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        ApiResponseHelper.error('Authentication required', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    // Get user's cards with pagination support
    const searchParams = request.nextUrl.searchParams;
    const paginationValidation = RequestValidator.validatePagination(searchParams);
    const { limit, offset } = paginationValidation;

    const { data, error, count } = await supabase
      .from('virtual_cards')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching cards:', error);
      return NextResponse.json(
        ApiResponseHelper.error(
          'Failed to fetch cards',
          'DATABASE_ERROR',
          process.env.NODE_ENV === 'development' ? { details: error.message } : undefined
        ),
        { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      ApiResponseHelper.paginated(
        data || [],
        { limit, offset, total: count || 0 },
        'Cards retrieved successfully'
      ),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      ApiResponseHelper.error(
        'Internal server error',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
      ),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};