import { NextRequest } from 'next/server';

/**
 * TypeScript type definitions for Next.js API routes
 */

/**
 * Route params interface for dynamic routes
 */
export interface RouteParams<T = Record<string, string>> {
  params: T;
}

/**
 * Type for wallet route params
 */
export interface WalletRouteParams extends RouteParams {
  params: {
    walletId: string;
  };
}

/**
 * Type for card route params
 */
export interface CardRouteParams extends RouteParams {
  params: {
    cardId: string;
  };
}

/**
 * Type for transaction route params
 */
export interface TransactionRouteParams extends RouteParams {
  params: {
    transactionId: string;
  };
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  count: number;
  total?: number;
}

/**
 * Standard handler type for GET requests
 */
export type GetHandler<T extends RouteParams = RouteParams> = (
  request: NextRequest,
  context: T
) => Promise<Response>;

/**
 * Standard handler type for POST requests
 */
export type PostHandler<T extends RouteParams = RouteParams> = (
  request: NextRequest,
  context: T
) => Promise<Response>;

/**
 * Standard handler type for PUT requests
 */
export type PutHandler<T extends RouteParams = RouteParams> = (
  request: NextRequest,
  context: T
) => Promise<Response>;

/**
 * Standard handler type for DELETE requests
 */
export type DeleteHandler<T extends RouteParams = RouteParams> = (
  request: NextRequest,
  context: T
) => Promise<Response>;