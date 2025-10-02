import { NextRequest, NextResponse } from 'next/server';
import { walletCache } from '@/server/walletCache';
import { featureFlags } from '@/lib/featureFlags';
import { 
  ApiResponseHelper, 
  RequestValidator, 
  HttpStatusCode, 
  WalletHistoryResponse,
  type StaticRouteHandler 
} from '@/types/api';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/wallet-history
 * Retrieves wallet transaction history with pagination
 * 
 * Query parameters:
 * - walletId (required): The wallet ID to retrieve history for
 * - limit (optional): Number of transactions to return (1-100, default: 10)
 * - offset (optional): Number of transactions to skip (default: 0)
 */
export const GET: StaticRouteHandler = async (request: NextRequest) => {
  try {
    // Initialize feature flags
    await featureFlags.initialize();

    // Check if transactions API is enabled
    const isTransactionsEnabled = featureFlags.isEnabled('transactions_api', { defaultValue: true });
    if (!isTransactionsEnabled) {
      return NextResponse.json(
        ApiResponseHelper.error(
          'Transactions API is currently disabled',
          'SERVICE_UNAVAILABLE'
        ), 
        { status: HttpStatusCode.SERVICE_UNAVAILABLE }
      );
    }
    
    // Get and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const walletId = searchParams.get('walletId');
    
    // Validate required parameters
    const requiredFieldErrors = RequestValidator.validateRequired({ walletId }, ['walletId']);
    if (requiredFieldErrors.length > 0) {
      return NextResponse.json(
        ApiResponseHelper.error(
          'Missing required parameters',
          'VALIDATION_ERROR',
          { errors: requiredFieldErrors }
        ),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    // Validate pagination parameters
    const paginationValidation = RequestValidator.validatePagination(searchParams);
    if (!paginationValidation.isValid) {
      return NextResponse.json(
        ApiResponseHelper.error(
          'Invalid pagination parameters',
          'VALIDATION_ERROR',
          { errors: paginationValidation.errors }
        ),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    const { limit, offset } = paginationValidation;
    
    // Get transaction history from cache
    const transactions = await walletCache.getTransactionHistory(walletId!, limit, offset);
    
    // Prepare response data
    const responseData: WalletHistoryResponse = {
      transactions,
      pagination: {
        limit,
        offset,
        total: transactions.length // Note: This should ideally come from a count query
      }
    };
    
    return NextResponse.json(
      ApiResponseHelper.success(responseData, 'Transaction history retrieved successfully'),
      { status: HttpStatusCode.OK }
    );
    
  } catch (error: any) {
    console.error('Error retrieving transaction history:', error);
    
    // Return appropriate error response based on error type
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        ApiResponseHelper.error(
          error.message,
          'VALIDATION_ERROR',
          { details: error.details }
        ),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }
    
    if (error.name === 'NotFoundError') {
      return NextResponse.json(
        ApiResponseHelper.error(
          'Wallet not found',
          'NOT_FOUND'
        ),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }
    
    // Generic server error
    return NextResponse.json(
      ApiResponseHelper.error(
        'Failed to retrieve transaction history',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
      ),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};
