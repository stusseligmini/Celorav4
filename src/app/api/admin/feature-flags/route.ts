import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/admin/feature-flags - Get all feature flags
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

    // Get all feature flags
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: flags || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/feature-flags:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/feature-flags - Update a feature flag
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { name, is_enabled, user_percentage, targeting_rules, description } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Feature flag name is required' },
        { status: 400 }
      );
    }

    // Update feature flag
    const updateData: any = {
      last_updated: new Date().toISOString()
    };

    if (typeof is_enabled === 'boolean') {
      updateData.is_enabled = is_enabled;
    }

    if (user_percentage !== undefined) {
      updateData.user_percentage = user_percentage;
    }

    if (targeting_rules !== undefined) {
      updateData.targeting_rules = targeting_rules;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    const { data: updatedFlag, error } = await supabase
      .from('feature_flags')
      .update(updateData)
      .eq('name', name)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: updatedFlag,
      message: `Feature flag "${name}" updated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in PUT /api/admin/feature-flags:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags - Create a new feature flag
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { name, description, is_enabled = false, user_percentage, targeting_rules } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: 'Name and description are required' },
        { status: 400 }
      );
    }

    // Create feature flag
    const { data: newFlag, error } = await supabase
      .from('feature_flags')
      .insert({
        name,
        description,
        is_enabled,
        user_percentage,
        targeting_rules,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { success: false, error: 'Feature flag with this name already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: newFlag,
      message: `Feature flag "${name}" created successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/feature-flags:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create feature flag' },
      { status: 500 }
    );
  }
}
