'use client';

import { useEffect, useState } from 'react';
import { notificationManager, Notification as NotificationManagerType } from '../lib/notificationManager';
import { getSupabaseClient } from '../lib/supabaseSingleton';
import { User } from '@supabase/supabase-js';

// Legacy Notification type for compatibility with existing components
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

// Convert new notification format to legacy format for backwards compatibility
function convertNotification(notification: NotificationManagerType): Notification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.payload.title,
    message: notification.payload.body,
    priority: notification.priority === 'critical' ? 'high' : notification.priority,
    read: notification.read,
    created_at: notification.createdAt,
    action_url: notification.payload.link || notification.payload.action?.url
  };
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize notification manager
    notificationManager.initialize().catch(console.error);

    // Get current user
    const fetchUser = async () => {
      try {
        const { data } = await getSupabaseClient().auth.getUser();
        setUser(data.user);
      } catch (err) {
        console.error('Error getting user:', err);
        setUser(null);
      }
    };

    fetchUser();

    // Listen for notification events
    const handleNotification = (event: Event) => {
      const newNotification = (event as CustomEvent).detail as NotificationManagerType;
      // Convert to legacy format and add to state
      const legacyNotification = convertNotification(newNotification);
      setNotifications(prev => [legacyNotification, ...prev]);
    };

    window.addEventListener('celora:notification', handleNotification);

    return () => {
      window.removeEventListener('celora:notification', handleNotification);
    };
  }, []);

  // Load notifications when user is available
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      
      try {
        const fetchedNotifications = await notificationManager.getNotifications(user.id);
        const legacyNotifications = fetchedNotifications.map(convertNotification);
        setNotifications(legacyNotifications);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadNotifications();
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!id) return;
    
    try {
      const success = await notificationManager.markAsRead(id);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, read: true } 
              : notification
          )
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      await Promise.all(
        unreadIds.map(id => notificationManager.markAsRead(id))
      );
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    if (!user) return;
    
    try {
      await notificationManager.sendNotification(
        user.id,
        notification.type as any,
        'in_app',
        {
          title: notification.title,
          body: notification.message,
          link: notification.action_url
        },
        notification.priority as any
      );
    } catch (err) {
      console.error('Error creating notification:', err);
      setError('Failed to create notification');
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

// React hook for notification count only
export function useNotificationCount(userId?: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Initial count
    notificationManager.getUnreadCount(userId).then(setCount);

    // Listen for new notifications
    const handleNewNotification = () => {
      notificationManager.getUnreadCount(userId).then(setCount);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('celora:notification', handleNewNotification);

      return () => {
        window.removeEventListener('celora:notification', handleNewNotification);
      };
    }
  }, [userId]);

  return count;
}
