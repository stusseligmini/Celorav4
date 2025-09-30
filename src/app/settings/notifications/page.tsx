import { Metadata } from 'next';
import UserNotificationPreferences from '@/components/UserNotificationPreferences';

export const metadata: Metadata = {
  title: 'Notification Preferences | Celora',
  description: 'Customize how you receive notifications from the Celora platform',
};

export default function NotificationPreferencesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-gray-600">
          Customize how you receive notifications from Celora. You can enable or disable different notification
          types for each communication channel.
        </p>
      </div>
      
      <UserNotificationPreferences />
    </div>
  );
}