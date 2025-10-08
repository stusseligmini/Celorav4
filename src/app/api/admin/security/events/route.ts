import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase/server';
import { headers } from 'next/headers';

// Type assertion for Supabase to handle security_events table
const supabase = supabaseServer as any;

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

async function validateAdminAuth() {
  const headersList = await headers();
  const authorization = headersList.get('authorization');
  
  if (!authorization?.startsWith('Bearer ')) {
    return { error: 'Unauthorized - Missing token', status: 401 };
  }
  
  const token = authorization.split('Bearer ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Unauthorized - Invalid token', status: 401 };
  }

  // Check user exists in user_profiles (unified schema)
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    return { error: 'Forbidden - User profile not found', status: 403 };
  }
  
  return { user, userProfile };
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const authResult = await validateAdminAuth();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
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

    // Build query using server client and unified schema
    let query = supabase
      .from('security_events')
      .select(`
        *,
        user_profile:user_id(id, email, full_name),
        resolver:resolved_by(id, email, full_name)
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

    // Get basic statistics (simplified)
    const { count: totalEvents } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true });
      
    const { count: unresolvedEvents } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);
      
    const stats = {
      total_events: totalEvents || 0,
      unresolved_events: unresolvedEvents || 0,
      critical_events: 0,
      events_last_24h: 0
    };

    return NextResponse.json({
      events: events || [],
      stats,
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
    // Validate admin authentication
    const authResult = await validateAdminAuth();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
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
    const headersList = await headers();
    const ip_address = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      'unknown';
    const user_agent = headersList.get('user-agent') || 'unknown';

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
      } as any)
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
    // Validate admin authentication
    const authResult = await validateAdminAuth();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user } = authResult;

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
        resolved_by: resolved ? user.id : null
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
