'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
  action_url?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    let channel: RealtimeChannel;

    async function setupNotifications() {
      try {
        // Fetch initial notifications
        const response = await fetch('/api/notifications');
        const data = await response.json();
        
        if (data.success) {
          setNotifications(data.notifications);
        } else {
          setError(data.error);
        }

        // Set up real-time subscription
        channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications'
            },
            (payload) => {
              console.log('Notification update:', payload);
              
              if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new as Notification, ...prev]);
                
                // Show browser notification if permission granted
                if (Notification.permission === 'granted') {
                  const notification = payload.new as Notification;
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    tag: notification.id
                  });
                }
              } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev => 
                  prev.map(n => 
                    n.id === payload.new.id ? payload.new as Notification : n
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                setNotifications(prev => 
                  prev.filter(n => n.id !== payload.old.id)
                );
              }
            }
          )
          .subscribe();

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }

    setupNotifications();

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: id, read: true }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      await Promise.all(
        unreadIds.map(id => 
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notificationId: id, read: true }),
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    loading,
    error
  };
}