'use client';

import { useState, useEffect } from 'react';
import { notificationManager, NotificationType, NotificationChannel, NotificationPriority } from '@/lib/notificationManager';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { featureFlags } from '@/lib/featureFlags';
import { Bell, Users, Settings } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<NotificationType>('system');
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>('in_app');
  const [notificationPriority, setNotificationPriority] = useState<NotificationPriority>('medium');
  const [notificationTitle, setNotificationTitle] = useState<string>('');
  const [notificationBody, setNotificationBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('send');
  
  const supabase = getSupabaseClient();

  // Get all users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, display_name, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    }

    fetchUsers();
  }, [supabase]);

  // Get notification history
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }

    fetchNotifications();
  }, [supabase]);

  const sendNotification = async () => {
    if (!selectedUser || !notificationTitle || !notificationBody) {
      alert('Please fill in all required fields and select a user');
      return;
    }

    setLoading(true);
    try {
      await notificationManager.sendNotification(
        selectedUser,
        notificationType,
        notificationChannel,
        {
          title: notificationTitle,
          body: notificationBody,
          data: {}
        },
        notificationPriority
      );

      // Reset form
      setNotificationTitle('');
      setNotificationBody('');
      setSelectedUser(null);
      
      alert('Notification sent successfully!');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(term) ||
      user.display_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Notification Management</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'send' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Send Notifications
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'history' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Notification History
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'flags' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Feature Flags
          </button>
        </nav>
      </div>

      {/* Send Notifications Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Selection */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Select User
            </h3>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 rounded border cursor-pointer ${
                    selectedUser === user.id 
                      ? 'bg-cyan-100 border-cyan-500' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedUser(user.id)}
                >
                  <div className="font-medium">{user.display_name || 'Unnamed User'}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Form */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Compose Notification
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="system">System</option>
                    <option value="transaction">Transaction</option>
                    <option value="security">Security</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                  <select
                    value={notificationChannel}
                    onChange={(e) => setNotificationChannel(e.target.value as NotificationChannel)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="in_app">In-App</option>
                    <option value="push">Push</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={notificationPriority}
                    onChange={(e) => setNotificationPriority(e.target.value as NotificationPriority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Notification title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Notification message..."
                />
              </div>
              
              <button
                onClick={sendNotification}
                disabled={loading || !selectedUser || !notificationTitle || !notificationBody}
                className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                  loading || !selectedUser || !notificationTitle || !notificationBody
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Notification History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notification.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {notification.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {notification.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        notification.status === 'delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : notification.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Flags Tab */}
      {activeTab === 'flags' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Notification Feature Flags
            </h3>
            <Link
              href="/admin/notifications/flags"
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              Manage All Flags
            </Link>
          </div>
          
          <p className="text-gray-600 mb-4">
            Control notification system behavior through feature flags. 
            Visit the full management page for comprehensive controls.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-2">Master Controls</h4>
              <p className="text-sm text-gray-600 mb-3">
                Global switches for the notification system
              </p>
              <Link
                href="/admin/notifications/flags?tab=master"
                className="text-cyan-600 hover:text-cyan-700 text-sm"
              >
                Configure Master Flags →
              </Link>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-2">Channel Controls</h4>
              <p className="text-sm text-gray-600 mb-3">
                Enable/disable specific notification channels
              </p>
              <Link
                href="/admin/notifications/flags?tab=channels"
                className="text-cyan-600 hover:text-cyan-700 text-sm"
              >
                Configure Channel Flags →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
