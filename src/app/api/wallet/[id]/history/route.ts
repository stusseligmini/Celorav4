import { z } from 'zod';
import { createRouteHandler, createAuthenticatedRouteHandler } from '@/lib/routeHandlerUtils';
import { NextResponse } from 'next/server';
import { WalletService, TransactionHistoryParams } from '@/lib/services/walletService';

// Validation schema for query parameters
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['created_at', 'amount', 'type']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  type: z.enum(['deposit', 'withdrawal', 'transfer', 'payment', 'refund', 'adjustment']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
});

// Validation schema for path parameters
const paramsSchema = z.object({
  id: z.string().uuid(),
});

// Get wallet transaction history
export const GET = createAuthenticatedRouteHandler(
  async ({ params, searchParams, userId }) => {
    const { id } = params;
    
    try {
      // Parse and validate query parameters
      const query = querySchema.parse(searchParams);
      
      // Convert to service parameters
      const historyParams: TransactionHistoryParams = {
        walletId: id,
        limit: query.limit,
        offset: query.offset,
        sort: query.sort,
        order: query.order,
        type: query.type,
        startDate: query.startDate,
        endDate: query.endDate,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        status: query.status,
      };
      
      // Get transaction history using service
      const result = await WalletService.getTransactionHistory(historyParams);
      
      // Return the results
      return NextResponse.json({
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Wallet history error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch wallet transactions' },
        { status: 500 }
      );
    }
  },
  {
    validation: {
      params: paramsSchema,
      query: querySchema,
    },
    rateLimit: {
      limit: 50,
      window: 60 // 1 minute
    },
    caching: {
      maxAge: 60, // 1 minute
      staleWhileRevalidate: 300 // 5 minutes
    },
    logging: true
  }
);

// Schema for creating a wallet transaction
const createTransactionSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.string().min(1).max(10),
  type: z.enum(['deposit', 'withdrawal', 'transfer', 'payment', 'refund', 'adjustment']),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  referenceId: z.string().optional(),
  merchantName: z.string().optional(),
  merchantCategory: z.string().optional(),
  merchantLocation: z.string().optional(),
  feeAmount: z.number().optional(),
  feeCurrency: z.string().optional(),
  sourceWalletId: z.string().uuid().optional(),
  destinationWalletId: z.string().uuid().optional()
});

// Create a new transaction for a wallet
export const POST = createAuthenticatedRouteHandler(
  async ({ req, params, userId }) => {
    const { id } = params;
    
    try {
      // Parse the request body
      const body = await req.json();
      const transactionData = createTransactionSchema.parse(body);
      
      // Create transaction using service
      const transaction = await WalletService.createTransaction({
        walletId: id,
        amount: transactionData.amount,
        currency: transactionData.currency,
        type: transactionData.type,
        description: transactionData.description,
        metadata: transactionData.metadata,
        referenceId: transactionData.referenceId,
        merchantName: transactionData.merchantName,
        merchantCategory: transactionData.merchantCategory,
        merchantLocation: transactionData.merchantLocation,
        feeAmount: transactionData.feeAmount,
        feeCurrency: transactionData.feeCurrency,
        sourceWalletId: transactionData.sourceWalletId,
        destinationWalletId: transactionData.destinationWalletId
      });
      
      // Return the created transaction
      return NextResponse.json(transaction, { status: 201 });
    } catch (error: any) {
      console.error('Create transaction error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create wallet transaction' },
        { status: 500 }
      );
    }
  },
  {
    validation: {
      params: paramsSchema,
      body: createTransactionSchema
    },
    rateLimit: {
      limit: 20,
      window: 60 // 1 minute
    },
    logging: true
  }
);