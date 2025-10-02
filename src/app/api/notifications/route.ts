import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notificationManager, NotificationType } from '@/lib/notificationManager';
import { featureFlags } from '@/lib/featureFlags';

export async function GET(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if notifications API is enabled
    const apiEnabled = featureFlags.isEnabled('notifications_api', { defaultValue: true });
    if (!apiEnabled) {
      return NextResponse.json(
        { success: false, error: 'Notifications API is disabled' },
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

    // Get URL parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeRead = url.searchParams.get('includeRead') !== 'false';

    // Get notifications from the notification manager
    const notifications = await notificationManager.getNotifications(
      user.id,
      limit,
      offset,
      includeRead
    );

    // Get unread count
    const unreadCount = await notificationManager.getUnreadCount(user.id);

    // Get user preferences
    const preferences = await notificationManager.getUserPreferences(user.id);

    // Transform notifications to match the legacy format
    const legacyNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.payload.title,
      message: notification.payload.body,
      timestamp: notification.createdAt,
      read: notification.read,
      priority: notification.priority,
      metadata: notification.payload.data || {},
      action_url: notification.payload.link || notification.payload.action?.url
    }));

    // Count notifications by category
    const categories = legacyNotifications.reduce((acc, notification) => {
      const type = notification.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform preferences to match the legacy format
    const settings = {
      pushEnabled: preferences?.channels.system?.push || false,
      emailEnabled: preferences?.channels.system?.email || false,
      smsEnabled: preferences?.channels.system?.sms || false,
      categories: Object.entries(preferences?.channels || {}).reduce((acc, [type, channels]) => {
        acc[type] = channels?.in_app || false;
        return acc;
      }, {} as Record<string, boolean>)
    };

    return NextResponse.json({
      success: true,
      data: {
        notifications: legacyNotifications,
        unreadCount,
        total: notifications.length,
        categories,
        settings
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch notifications' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();
    
    // Check if notifications API is enabled
    const apiEnabled = featureFlags.isEnabled('notifications_api', { defaultValue: true });
    if (!apiEnabled) {
      return NextResponse.json(
        { success: false, error: 'Notifications API is disabled' },
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

    const { action, notificationId, settings, type, title, message, priority = 'medium', link, data } = body;

    // Mark a notification as read
    if (action === 'mark_read' && notificationId) {
      const success = await notificationManager.markAsRead(notificationId);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: `Notification ${notificationId} marked as read`,
        timestamp: new Date().toISOString()
      });
    }

    // Mark all notifications as read
    if (action === 'mark_all_read') {
      // Get all unread notifications
      const notifications = await notificationManager.getNotifications(user.id, 1000, 0, false);
      
      // Mark each notification as read
      const results = await Promise.all(
        notifications.map(notification => notificationManager.markAsRead(notification.id))
      );
      
      if (results.some(success => !success)) {
        return NextResponse.json(
          { success: false, error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        timestamp: new Date().toISOString()
      });
    }

    // Update notification settings
    if (action === 'update_settings' && settings) {
      const success = await notificationManager.updatePreferences(user.id, settings);
      
      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update notification settings' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: settings,
        timestamp: new Date().toISOString()
      });
    }

    // Create a new notification
    if (!action && type && title && message) {
      const notification = await notificationManager.sendNotification(
        user.id,
        type as NotificationType,
        'in_app',
        {
          title,
          body: message,
          link,
          data
        },
        priority as any
      );
      
      if (!notification) {
        return NextResponse.json(
          { success: false, error: 'Failed to create notification' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Notification created successfully',
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.payload.title,
          message: notification.payload.body,
          timestamp: notification.createdAt,
          read: notification.read,
          priority: notification.priority,
          metadata: notification.payload.data || {},
          action_url: notification.payload.link || notification.payload.action?.url
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid action or missing parameters' 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing notification action:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process notification action' 
      },
      { status: 500 }
    );
  }
}
