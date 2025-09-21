import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface TransactionRiskFactors {
  amount: number;
  frequency: number;
  location: string;
  time: string;
  merchant: string;
  category: string;
}

function calculateRiskScore(factors: TransactionRiskFactors, userHistory: any[]): number {
  let score = 0;
  
  // Amount-based risk (higher amounts = higher risk)
  if (factors.amount > 1000) score += 20;
  else if (factors.amount > 500) score += 10;
  else if (factors.amount > 100) score += 5;
  
  // Time-based risk (transactions at unusual hours)
  const hour = new Date(factors.time).getHours();
  if (hour < 6 || hour > 23) score += 15;
  
  // Frequency risk (too many transactions in short time)
  const recentTransactions = userHistory.filter(t => 
    new Date(t.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
  );
  if (recentTransactions.length > 5) score += 25;
  else if (recentTransactions.length > 3) score += 15;
  
  // Velocity risk (spending rate)
  const last24hSpending = userHistory
    .filter(t => new Date(t.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  if (last24hSpending > 5000) score += 30;
  else if (last24hSpending > 2000) score += 20;
  else if (last24hSpending > 1000) score += 10;
  
  // Location risk (simplified - would use geolocation in production)
  if (factors.location && factors.location.toLowerCase().includes('unknown')) {
    score += 15;
  }
  
  // High-risk categories
  const highRiskCategories = ['gambling', 'crypto', 'cash_advance', 'money_transfer'];
  if (highRiskCategories.includes(factors.category?.toLowerCase())) {
    score += 20;
  }
  
  return Math.min(score, 100); // Cap at 100
}

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      transaction_id,
      amount,
      merchant,
      category,
      location,
      auto_check = true 
    } = await request.json();

    if (!transaction_id || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: transaction_id, amount' 
      }, { status: 400 });
    }

    // Get user's transaction history for analysis
    const { data: userHistory } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false });

    // Calculate risk score
    const riskFactors: TransactionRiskFactors = {
      amount,
      frequency: userHistory?.length || 0,
      location: location || 'unknown',
      time: new Date().toISOString(),
      merchant: merchant || 'unknown',
      category: category || 'other'
    };

    const riskScore = calculateRiskScore(riskFactors, userHistory || []);
    const riskLevel = getRiskLevel(riskScore);
    
    // Determine action based on risk level
    let action = 'approve';
    let reason = 'Transaction appears normal';
    
    if (riskScore >= 80) {
      action = 'block';
      reason = 'High fraud risk detected';
    } else if (riskScore >= 60) {
      action = 'review';
      reason = 'Transaction requires manual review';
    } else if (riskScore >= 30) {
      action = 'monitor';
      reason = 'Transaction flagged for monitoring';
    }

    // Update transaction with fraud score
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        fraud_score: riskScore,
        risk_level: riskLevel,
        fraud_check_status: action
      })
      .eq('id', transaction_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Transaction update error:', updateError);
    }

    // Log security event if high risk
    if (riskScore >= 60) {
      await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: 'suspicious_transaction',
          description: `High-risk transaction detected: ${reason}`,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            transaction_id,
            risk_score: riskScore,
            risk_level: riskLevel,
            amount,
            merchant,
            category
          }
        });

      // Create notification for high-risk transactions
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'security',
          title: 'Transaction Alert',
          message: `${action === 'block' ? 'Blocked' : 'Flagged'} transaction for ${formatCurrency(amount)} - ${reason}`,
          priority: action === 'block' ? 'high' : 'medium'
        });
    }

    return NextResponse.json({
      success: true,
      fraud_check: {
        transaction_id,
        risk_score: riskScore,
        risk_level: riskLevel,
        action,
        reason,
        factors_analyzed: {
          amount_risk: amount > 500,
          frequency_risk: (userHistory?.length || 0) > 10,
          time_risk: new Date().getHours() < 6 || new Date().getHours() > 23,
          category_risk: ['gambling', 'crypto', 'cash_advance'].includes(category?.toLowerCase())
        },
        recommendations: action === 'block' 
          ? ['Contact customer support', 'Verify transaction legitimacy', 'Consider additional authentication']
          : action === 'review'
          ? ['Monitor transaction closely', 'Verify merchant legitimacy', 'Check for unusual patterns']
          : ['Continue monitoring', 'Normal transaction patterns']
      }
    });

    function formatCurrency(amount: number): string {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }

  } catch (error) {
    console.error('Fraud detection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get fraud statistics
    const { data: transactions } = await supabase
      .from('transactions')
      .select('fraud_score, risk_level, fraud_check_status, amount, created_at')
      .eq('user_id', user.id)
      .not('fraud_score', 'is', null)
      .order('created_at', { ascending: false });

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        statistics: {
          total_checked: 0,
          blocked: 0,
          reviewed: 0,
          approved: 0,
          avg_risk_score: 0,
          high_risk_count: 0
        },
        recent_checks: []
      });
    }

    // Calculate statistics
    const blocked = transactions.filter(t => t.fraud_check_status === 'block').length;
    const reviewed = transactions.filter(t => t.fraud_check_status === 'review').length;
    const approved = transactions.filter(t => t.fraud_check_status === 'approve').length;
    const highRisk = transactions.filter(t => t.fraud_score >= 60).length;
    
    const avgRiskScore = transactions.reduce((sum, t) => sum + (t.fraud_score || 0), 0) / transactions.length;

    return NextResponse.json({
      success: true,
      statistics: {
        total_checked: transactions.length,
        blocked,
        reviewed,
        approved,
        avg_risk_score: Math.round(avgRiskScore * 100) / 100,
        high_risk_count: highRisk,
        block_rate: (blocked / transactions.length) * 100,
        review_rate: (reviewed / transactions.length) * 100
      },
      recent_checks: transactions.slice(0, 20).map(t => ({
        amount: t.amount,
        risk_score: t.fraud_score,
        risk_level: t.risk_level,
        status: t.fraud_check_status,
        date: t.created_at
      }))
    });

  } catch (error) {
    console.error('Fraud statistics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}