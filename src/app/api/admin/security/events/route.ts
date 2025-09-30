import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/lib/supabaseSingleton';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

interface SecurityEventFilters {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  event_type?: string;
  resolved?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  user_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: SecurityEventFilters = {};
    const severity = searchParams.get('severity');
    const event_type = searchParams.get('event_type');
    const resolved = searchParams.get('resolved');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (severity) filters.severity = severity as any;
    if (event_type) filters.event_type = event_type;
    if (resolved !== null) filters.resolved = resolved === 'true';
    if (start_date && end_date) {
      filters.date_range = { start: start_date, end: end_date };
    }
    if (user_id) filters.user_id = user_id;

    // Build query
    let query = supabase
      .from('security_events')
      .select(`
        *,
        profiles:user_id(email, full_name),
        resolver:resolved_by(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved);
    }
    if (filters.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching security events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_security_event_stats');

    return NextResponse.json({
      events: events || [],
      stats: stats || {
        total_events: 0,
        unresolved_events: 0,
        critical_events: 0,
        events_last_24h: 0
      },
      pagination: {
        limit,
        offset,
        total: events?.length || 0
      }
    });

  } catch (error) {
    console.error('Security events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { event_type, severity, description, user_id, metadata } = body;

    // Validate required fields
    if (!event_type || !severity || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, severity, description' },
        { status: 400 }
      );
    }

    // Validate severity level
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Create security event
    const { data: event, error: createError } = await supabase
      .from('security_events')
      .insert({
        event_type,
        severity,
        description,
        user_id: user_id || null,
        ip_address,
        user_agent,
        metadata: metadata || {},
        resolved: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating security event:', createError);
      return NextResponse.json({ error: 'Failed to create security event' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Security event created successfully',
      event
    }, { status: 201 });

  } catch (error) {
    console.error('Security events POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { event_ids, action } = body;

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      return NextResponse.json({ error: 'event_ids array is required' }, { status: 400 });
    }

    if (!action || !['resolve', 'unresolve', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be resolve, unresolve, or delete' }, { status: 400 });
    }

    let result;

    if (action === 'delete') {
      // Delete events
      const { error: deleteError } = await supabase
        .from('security_events')
        .delete()
        .in('id', event_ids);

      if (deleteError) {
        console.error('Error deleting security events:', deleteError);
        return NextResponse.json({ error: 'Failed to delete security events' }, { status: 500 });
      }

      result = { message: `${event_ids.length} security events deleted successfully` };
    } else {
      // Resolve or unresolve events
      const resolved = action === 'resolve';
      const update_data: any = {
        resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? session.user.id : null
      };

      const { data: events, error: updateError } = await supabase
        .from('security_events')
        .update(update_data)
        .in('id', event_ids)
        .select();

      if (updateError) {
        console.error('Error updating security events:', updateError);
        return NextResponse.json({ error: 'Failed to update security events' }, { status: 500 });
      }

      result = {
        message: `${event_ids.length} security events ${action}d successfully`,
        updated_events: events
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Security events PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}