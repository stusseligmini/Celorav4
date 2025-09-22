import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's transactions for spending analysis
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories (
          name,
          icon,
          color
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate spending insights
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentMonthSpending = transactions?.filter(t => 
      new Date(t.created_at) >= currentMonth && t.amount > 0
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const lastMonthSpending = transactions?.filter(t => 
      new Date(t.created_at) >= lastMonth && 
      new Date(t.created_at) < currentMonth && 
      t.amount > 0
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const weeklySpending = transactions?.filter(t => 
      new Date(t.created_at) >= currentWeek && t.amount > 0
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    // Category breakdown
    const categorySpending: Record<string, number> = {};
    transactions?.forEach(t => {
      if (t.amount > 0) {
        const categoryName = t.transaction_categories?.name || 'Other';
        categorySpending[categoryName] = (categorySpending[categoryName] || 0) + t.amount;
      }
    });

    // Top categories
    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount: amount as number }));

    // Daily spending trend (last 30 days)
    const dailySpending: Record<string, number> = {};
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    transactions?.filter(t => 
      new Date(t.created_at) >= last30Days && t.amount > 0
    ).forEach(t => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      dailySpending[date] = (dailySpending[date] || 0) + t.amount;
    });

    // Calculate trends
    const monthlyChange = lastMonthSpending > 0 
      ? ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100 
      : 0;

    // Average daily spending
    const avgDailySpending = currentMonthSpending / now.getDate();

    // Projected monthly spending
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthlySpending = avgDailySpending * daysInMonth;

    // Get or create spending insights record
    const { data: existingInsight } = await supabase
      .from('spending_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', 'monthly')
      .eq('period_start', currentMonth.toISOString().split('T')[0])
      .single();

    const insightData = {
      user_id: user.id,
      period_type: 'monthly',
      period_start: currentMonth.toISOString().split('T')[0],
      period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      total_spending: currentMonthSpending,
      category_breakdown: categorySpending,
      top_categories: topCategories,
      avg_transaction_amount: transactions?.length > 0 
        ? currentMonthSpending / transactions.filter(t => t.amount > 0).length 
        : 0,
      transaction_count: transactions?.filter(t => t.amount > 0).length || 0,
      trends: {
        monthly_change: monthlyChange,
        weekly_spending: weeklySpending,
        daily_average: avgDailySpending,
        projected_monthly: projectedMonthlySpending
      }
    };

    if (existingInsight) {
      // Update existing insight
      const { data: updatedInsight, error: updateError } = await supabase
        .from('spending_insights')
        .update(insightData)
        .eq('id', existingInsight.id)
        .select()
        .single();

      if (updateError) {
        console.error('Insight update error:', updateError);
      }
    } else {
      // Create new insight
      const { error: insertError } = await supabase
        .from('spending_insights')
        .insert(insightData);

      if (insertError) {
        console.error('Insight creation error:', insertError);
      }
    }

    return NextResponse.json({
      success: true,
      insights: {
        current_month: {
          spending: currentMonthSpending,
          change_from_last_month: monthlyChange,
          transaction_count: transactions?.filter(t => t.amount > 0).length || 0
        },
        weekly: {
          spending: weeklySpending,
          daily_average: weeklySpending / 7
        },
        categories: {
          breakdown: categorySpending,
          top_categories: topCategories
        },
        trends: {
          daily_spending: Object.entries(dailySpending).map(([date, amount]) => ({
            date,
            amount
          })),
          projected_monthly: projectedMonthlySpending,
          avg_daily: avgDailySpending
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Spending insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}