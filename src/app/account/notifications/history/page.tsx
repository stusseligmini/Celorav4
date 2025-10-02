'use client';

import { useState, useEffect } from 'react';
import { notificationManager } from '@/lib/notificationManager';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { format, formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: string;
  priority: string;
  payload: {
    title: string;
    body: string;
    link?: string;
    data?: any;
  };
  read: boolean;
  sent: boolean;
  delivered: boolean;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Get the current user
    const fetchUser = async () => {
      const { data } = await getSupabaseClient().auth.getUser();
      setUser(data.user);
    };

    fetchUser();
  }, []);

  // Load notifications when user is available
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notifications = await notificationManager.getNotifications(user.id, 100, 0, true);
        setNotifications(notifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    if (!id) return;

    try {
      const success = await notificationManager.markAsRead(id);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, read: true, readAt: new Date().toISOString() } 
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate if there's a link
    if (notification.payload.link) {
      window.location.href = notification.payload.link;
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  // Get notification type counts
  const notificationTypes = notifications.reduce((acc, notification) => {
    const type = notification.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get notification type name
  const getTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      transaction: 'Transactions',
      security: 'Security',
      account: 'Account',
      marketing: 'Marketing',
      system: 'System',
      card: 'Card',
      wallet: 'Wallet',
      transfer: 'Transfer',
      reward: 'Rewards',
      promotion: 'Promotions'
    };
    
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get notification icon
  const getNotificationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      transaction: '💳',
      security: '🔒',
      account: '👤',
      marketing: '📢',
      system: '⚙️',
      card: '💳',
      wallet: '💰',
      transfer: '🔄',
      reward: '🎁',
      promotion: '🎉'
    };
    
    return iconMap[type] || '📱';
  };

  // Get priority class
  const getPriorityClass = (priority: string): string => {
    const classMap: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return classMap[priority] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p>Please sign in to view your notification history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Notification History</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-medium text-lg mb-4">Filters</h2>
            
            <nav className="space-y-1">
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${filter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setFilter('all')}
              >
                All Notifications
                <span className="float-right bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  {notifications.length}
                </span>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${filter === 'unread' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setFilter('unread')}
              >
                Unread
                <span className="float-right bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs">
                  {notifications.filter(n => !n.read).length}
                </span>
              </button>
              
              <div className="pt-2 pb-1 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categories
              </div>
              
              {Object.entries(notificationTypes).map(([type, count]) => (
                <button
                  key={type}
                  className={`w-full text-left px-3 py-2 rounded-md ${filter === type ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                  onClick={() => setFilter(type)}
                >
                  {getTypeName(type)}
                  <span className="float-right bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                    {count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-lg">
                  {filter === 'all' 
                    ? 'All Notifications' 
                    : filter === 'unread' 
                      ? 'Unread Notifications'
                      : `${getTypeName(filter)} Notifications`
                  }
                </h2>
                
                <div className="text-sm text-gray-500">
                  {filteredNotifications.length} notifications
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-5xl mb-4">🔔</div>
                <h3 className="text-xl font-medium mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {filter === 'all' 
                    ? "You don't have any notifications yet" 
                    : filter === 'unread' 
                      ? "You don't have any unread notifications"
                      : `You don't have any ${filter} notifications`
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0 mr-4 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{notification.payload.title}</h3>
                          <div className="ml-2 flex-shrink-0">
                            {!notification.read && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mt-1">{notification.payload.body}</p>
                        
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="mr-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded text-xs ${getPriorityClass(notification.priority)}`}>
                            {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                          </span>
                          
                          {notification.read && notification.readAt && (
                            <span className="ml-2 text-xs">
                              Read: {format(new Date(notification.readAt), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
