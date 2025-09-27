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
        try {
          const response = await fetch('/api/notifications');
          const data = await response.json();
          
          if (data.success && data.data?.notifications) {
            setNotifications(data.data.notifications || []);
          } else {
            console.warn('Failed to get valid notifications data:', data);
            // Use empty array if data is missing or malformed
            setNotifications([]);
          }
        } catch (fetchErr) {
          console.error('Error fetching notifications:', fetchErr);
          // Safely set empty notifications on error
          setNotifications([]);
        }

        // Set up real-time subscription with error handling
        try {
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
                try {
                  console.log('Notification update:', payload);
                  
                  if (payload.eventType === 'INSERT') {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                    
                    // Show browser notification if permission granted
                    if (typeof window !== 'undefined' && 
                        'Notification' in window && 
                        Notification.permission === 'granted') {
                      try {
                        const notification = payload.new as Notification;
                        new Notification(notification.title, {
                          body: notification.message,
                          icon: '/icon-192x192.png',
                          badge: '/icon-192x192.png',
                          tag: notification.id
                        });
                      } catch (notifErr) {
                        console.error('Error showing browser notification:', notifErr);
                      }
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
                } catch (payloadErr) {
                  console.error('Error processing notification payload:', payloadErr);
                }
              }
            )
            .subscribe();
        } catch (channelErr) {
          console.error('Error setting up supabase channel:', channelErr);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }

    setupNotifications();

    // Request notification permission - with additional error handling
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(err => {
            console.warn('Failed to request notification permission:', err);
          });
        }
      }
    } catch (notifErr) {
      console.warn('Error accessing Notification API:', notifErr);
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