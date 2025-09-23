import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock notifications data
    const notifications = {
      unreadCount: 5,
      total: 23,
      notifications: [
        {
          id: 'notif_001',
          type: 'transaction',
          title: 'Payment Successful',
          message: 'Your payment of $45.67 to Amazon has been processed',
          timestamp: '2025-09-23T11:30:00Z',
          read: false,
          priority: 'medium',
          metadata: {
            amount: 45.67,
            merchant: 'Amazon',
            cardId: 'card_12345'
          }
        },
        {
          id: 'notif_002',
          type: 'security',
          title: 'New Device Login',
          message: 'A new device accessed your account from New York, US',
          timestamp: '2025-09-23T10:15:00Z',
          read: false,
          priority: 'high',
          metadata: {
            device: 'iPhone 15 Pro',
            location: 'New York, US',
            ipAddress: '192.168.1.100'
          }
        },
        {
          id: 'notif_003',
          type: 'crypto',
          title: 'Bitcoin Price Alert',
          message: 'BTC has reached your target price of $43,000',
          timestamp: '2025-09-23T09:45:00Z',
          read: false,
          priority: 'medium',
          metadata: {
            symbol: 'BTC',
            currentPrice: 43250.00,
            targetPrice: 43000.00
          }
        },
        {
          id: 'notif_004',
          type: 'system',
          title: 'Monthly Statement Ready',
          message: 'Your September 2025 statement is now available',
          timestamp: '2025-09-23T08:00:00Z',
          read: true,
          priority: 'low',
          metadata: {
            period: '2025-09',
            type: 'monthly_statement'
          }
        },
        {
          id: 'notif_005',
          type: 'transaction',
          title: 'Large Transaction Alert',
          message: 'Transaction of $1,250.00 detected - please verify',
          timestamp: '2025-09-22T16:30:00Z',
          read: true,
          priority: 'high',
          metadata: {
            amount: 1250.00,
            merchant: 'Best Buy',
            requiresVerification: true
          }
        }
      ],
      categories: {
        transaction: 12,
        security: 4,
        crypto: 3,
        system: 4
      },
      settings: {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        categories: {
          transaction: true,
          security: true,
          crypto: true,
          system: false
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: notifications,
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
    const body = await request.json();
    const { action, notificationId, settings } = body;

    if (action === 'mark_read' && notificationId) {
      return NextResponse.json({
        success: true,
        message: `Notification ${notificationId} marked as read`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'mark_all_read') {
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'update_settings' && settings) {
      return NextResponse.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: settings,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'delete' && notificationId) {
      return NextResponse.json({
        success: true,
        message: `Notification ${notificationId} deleted`,
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