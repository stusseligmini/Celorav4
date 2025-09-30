import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/admin/metrics - Get system metrics
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin role
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

    // Get system metrics
    const metrics = await getSystemMetrics(supabase);

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/metrics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

async function getSystemMetrics(supabase: any) {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users (logged in within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', oneDayAgo);

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Get total volume (sum of all completed transactions)
    const { data: volumeData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'completed');

    const totalVolume = volumeData?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;

    // Calculate system health (simplified)
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (totalUsers && activeUsers) {
      const activePercentage = (activeUsers / totalUsers) * 100;
      if (activePercentage < 10) {
        systemHealth = 'critical';
      } else if (activePercentage < 30) {
        systemHealth = 'warning';
      }
    }

    // Calculate uptime (simplified - would normally come from system monitoring)
    const uptimeHours = Math.floor(Math.random() * 100) + 700; // Mock uptime
    const days = Math.floor(uptimeHours / 24);
    const hours = uptimeHours % 24;
    const uptime = `${days}d ${hours}h`;

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalTransactions: totalTransactions || 0,
      totalVolume,
      systemHealth,
      uptime
    };
  } catch (error) {
    console.error('Error calculating system metrics:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalTransactions: 0,
      totalVolume: 0,
      systemHealth: 'critical' as const,
      uptime: '0d 0h'
    };
  }
}