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

    // Get user's security events
    const { data: events, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Analyze security metrics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentEvents = events?.filter(e => new Date(e.created_at) >= last24h) || [];
    const weeklyEvents = events?.filter(e => new Date(e.created_at) >= last7d) || [];

    // Count event types
    const eventTypes: Record<string, number> = {};
    const suspiciousEvents = [];
    
    events?.forEach((event: any) => {
      eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
      
      // Flag suspicious events
      if (['login_failed', '2fa_verification_failed', 'suspicious_transaction'].includes(event.event_type)) {
        suspiciousEvents.push(event);
      }
    });

    // Calculate risk score (0-100)
    let riskScore = 0;
    if (suspiciousEvents.length > 0) riskScore += Math.min(suspiciousEvents.length * 10, 50);
    if (recentEvents.length > 10) riskScore += 20;
    
    // Get user profile for additional context
    const { data: profile } = await supabase
      .from('profiles')
      .select('two_factor_enabled, kyc_status, last_login_at')
      .eq('id', user.id)
      .single();

    if (!profile?.two_factor_enabled) riskScore += 15;
    if (profile?.kyc_status !== 'verified') riskScore += 10;

    const riskLevel = riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high';

    return NextResponse.json({
      success: true,
      events: events || [],
      metrics: {
        total_events: events?.length || 0,
        events_24h: recentEvents.length,
        events_7d: weeklyEvents.length,
        event_types: eventTypes,
        suspicious_events: suspiciousEvents.length,
        risk_score: riskScore,
        risk_level: riskLevel
      },
      security_status: {
        two_factor_enabled: profile?.two_factor_enabled || false,
        kyc_verified: profile?.kyc_status === 'verified',
        last_login: profile?.last_login_at
      }
    });

  } catch (error) {
    console.error('Security events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_type, description, metadata } = await request.json();

    if (!event_type || !description) {
      return NextResponse.json({ 
        error: 'Missing required fields: event_type, description' 
      }, { status: 400 });
    }

    // Create security event
    const { data: event, error } = await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type,
        description,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-create notification for high-risk events
    const highRiskEvents = [
      'login_failed_multiple',
      'suspicious_transaction',
      'account_locked',
      'password_changed',
      '2fa_disabled'
    ];

    if (highRiskEvents.includes(event_type)) {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'security',
          title: 'Security Alert',
          message: description,
          priority: 'high'
        });
    }

    return NextResponse.json({
      success: true,
      event,
      message: 'Security event logged successfully'
    });

  } catch (error) {
    console.error('Security event creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
