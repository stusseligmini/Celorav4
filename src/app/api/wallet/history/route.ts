/**
 * API route to access wallet transaction history. 
 * 
 * This endpoint has been temporarily moved to /api/wallet-history due to
 * type compatibility issues. Please use that endpoint instead with the 
 * walletId as a query parameter.
 * 
 * Example: GET /api/wallet-history?walletId=123&limit=10&offset=0
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'This endpoint has been moved to /api/wallet-history. Please use that endpoint instead.',
    data: {
      newEndpoint: '/api/wallet-history',
      example: '/api/wallet-history?walletId=123&limit=10&offset=0'
    }
  }, { status: 301 });
}
