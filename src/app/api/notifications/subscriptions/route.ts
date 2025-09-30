import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationManager } from '@/lib/notificationManager';
import { featureFlags } from '@/lib/featureFlags';

/**
 * Handler for POST requests to /api/notifications/subscriptions
 * Used for registering or updating push notification subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if push notifications are enabled
    const pushEnabled = featureFlags.isEnabled('notifications_push', { defaultValue: false });
    if (!pushEnabled) {
      return NextResponse.json(
        { success: false, error: 'Push notifications are disabled' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Get the current user from Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update feature flags with user context
    await featureFlags.initialize({
      userId: user.id,
      email: user.email,
      role: user.app_metadata?.role
    });

    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Missing subscription data' },
        { status: 400 }
      );
    }

    // Save the subscription to the database
    const result = await notificationManager.savePushSubscriptionForUser(
      user.id, 
      subscription
    );
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to save push subscription' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save push subscription' 
      },
      { status: 500 }
    );
  }
}

/**
 * Handler for DELETE requests to /api/notifications/subscriptions
 * Used for removing push notification subscriptions
 */
export async function DELETE(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if push notifications are enabled
    const pushEnabled = featureFlags.isEnabled('notifications_push', { defaultValue: false });
    if (!pushEnabled) {
      return NextResponse.json(
        { success: false, error: 'Push notifications are disabled' },
        { status: 403 }
      );
    }
    
    // Get the current user from Supabase
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update feature flags with user context
    await featureFlags.initialize({
      userId: user.id,
      email: user.email,
      role: user.app_metadata?.role
    });

    // Get endpoint from query params if available
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    // Delete the subscription from the database
    const success = await notificationManager.deletePushSubscriptionForUser(
      user.id,
      endpoint || undefined
    );
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete push subscription' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Push subscription deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting push subscription:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete push subscription' 
      },
      { status: 500 }
    );
  }
}