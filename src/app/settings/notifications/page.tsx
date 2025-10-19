import { Metadata } from 'next';
import NotificationSettings from '@/components/solana/NotificationSettings';
import UserNotificationPreferences from '@/components/UserNotificationPreferences';

export const metadata: Metadata = {
  title: 'Notification Settings | Celora',
  description: 'Configure your Solana transaction and push notification preferences',
};

export default function NotificationPreferencesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Solana Notification Settings */}
      <NotificationSettings />
      
      {/* Legacy Notification Preferences */}
      <div className="max-w-4xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Legacy Notification Preferences</h2>
            <p className="text-gray-600">
              Additional notification settings for the Celora platform.
            </p>
          </div>
          
          <UserNotificationPreferences />
        </div>
      </div>
    </div>
  );
}
