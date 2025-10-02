import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple ping endpoint for checking API connectivity
 * Used by the NetworkStatusHandler component to monitor connection quality
 */
export async function GET(request: NextRequest) {
  // Get the request timestamp for calculating latency
  const requestTime = Date.now();
  
  // Create a response with basic server status
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: requestTime,
      env: process.env.NODE_ENV
    },
    { 
      status: 200,
      headers: {
        // Set cache control to no-cache to ensure fresh status checks
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
}
