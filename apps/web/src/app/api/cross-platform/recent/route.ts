import { NextRequest, NextResponse } from 'next/server';
import { CrossPlatformService } from '@celora/infrastructure';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session/auth (placeholder for now)
    const userId = request.headers.get('x-user-id') || 'demo-user-id';
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25');

    const crossPlatformService = new CrossPlatformService();
    const transactions = await crossPlatformService.getRecentTransactions(userId, limit);

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Recent transactions API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}