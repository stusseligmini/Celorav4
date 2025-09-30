/**
 * TypeScript types for Next.js API route handlers
 * Ensures consistency across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';

// Base API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

// Pagination interface
export interface PaginationParams {
  limit: number;
  offset: number;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: PaginationParams;
}

// Route handler types for Next.js 15 (params are now Promises)
export type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<ApiResponse>> | NextResponse<ApiResponse>;

// Static route handler (no params)
export type StaticRouteHandler = (
  request: NextRequest
) => Promise<NextResponse<ApiResponse>> | NextResponse<ApiResponse>;

// Dynamic route context type for Next.js 15
export interface RouteContext {
  params: Promise<Record<string, string | string[]>>;
}

// Wallet transaction interface
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Wallet history response
export interface WalletHistoryResponse {
  transactions: WalletTransaction[];
  pagination: PaginationParams;
}

// Error response helper
export interface ApiErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// Success response helper
export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

// HTTP status codes enum
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// API response helpers
export class ApiResponseHelper {
  static success<T>(data: T, message?: string): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static error(error: string, code?: string, details?: Record<string, any>): ApiErrorResponse {
    return {
      success: false,
      error,
      code,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    data: T[],
    pagination: PaginationParams,
    message?: string
  ): PaginatedResponse<T[]> {
    return {
      success: true,
      data,
      message,
      pagination,
      timestamp: new Date().toISOString(),
    };
  }
}

// Request validation helpers
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class RequestValidator {
  static validateRequired(params: Record<string, any>, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const field of requiredFields) {
      if (!params[field] || params[field] === '') {
        errors.push({
          field,
          message: `${field} is required`,
          value: params[field],
        });
      }
    }
    
    return errors;
  }

  static validatePagination(searchParams: URLSearchParams): {
    isValid: boolean;
    limit: number;
    offset: number;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    let offset = parseInt(searchParams.get('offset') || '0', 10);

    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({
        field: 'limit',
        message: 'Limit must be a number between 1 and 100',
        value: limit,
      });
      limit = 10; // Default fallback
    }

    if (isNaN(offset) || offset < 0) {
      errors.push({
        field: 'offset',
        message: 'Offset must be a number greater than or equal to 0',
        value: offset,
      });
      offset = 0; // Default fallback
    }

    return {
      isValid: errors.length === 0,
      limit,
      offset,
      errors,
    };
  }
}