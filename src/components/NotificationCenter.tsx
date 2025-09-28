'use client';

import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading, error } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  // Make sure notifications is always an array, even if hook fails
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  // Make sure unreadCount is a number
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0;

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Unknown date';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400/20 bg-red-400/5';
      case 'medium': return 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5';
      case 'low': return 'text-gray-400 border-gray-400/20 bg-gray-400/5';
      default: return 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return '💳';
      case 'security': return '🔒';
      case 'wallet_created': return '🔗';
      case 'crypto_price': return '📈';
      case 'system': return '⚙️';
      default: return '📱';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <div className="w-6 h-6 relative">
          <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-pulse"></div>
          <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
                      {typeof unreadCount === 'number' && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-mono"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-96 bg-black/90 backdrop-blur-xl border border-cyan-400/20 rounded-lg shadow-2xl shadow-cyan-400/20 z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-cyan-400/20">
              <div className="flex items-center justify-between">
                <h3 className="text-cyan-400 font-mono font-bold">NOTIFICATIONS</h3>
                {typeof unreadCount === 'number' && unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {safeUnreadCount || 0} unread • {safeNotifications.length || 0} total
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full mx-auto"></div>
                  <div className="mt-2 text-sm">Loading notifications...</div>
                </div>
              ) : safeNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  <div className="text-sm">
                    {error ? 'Failed to load notifications' : 'No notifications yet'}
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {safeNotifications.map((notification: Notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                        notification.read 
                          ? 'bg-gray-900/50 border-gray-700/20' 
                          : getPriorityColor(notification.priority)
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        if (notification.action_url) {
                          window.location.href = notification.action_url;
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-xl flex-shrink-0">
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-mono font-bold truncate ${
                              notification.read ? 'text-gray-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 animate-pulse"></div>
                            )}
                          </div>
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            notification.read ? 'text-gray-500' : 'text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(notification.created_at)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {safeNotifications.length > 0 && (
              <div className="p-3 border-t border-cyan-400/20 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
                >
                  VIEW ALL NOTIFICATIONS →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}