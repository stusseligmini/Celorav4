import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Notification Management | Celora Admin',
  description: 'Manage notifications and notification settings for the Celora platform',
};

interface AdminNotificationsLayoutProps {
  children: React.ReactNode;
}

export default function AdminNotificationsLayout({ children }: AdminNotificationsLayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage notifications, settings, and feature flags for the Celora platform
          </p>
        </div>
        
        {/* Admin Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <Link
              href="/admin/notifications"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/notifications/flags"
              className="border-cyan-500 text-cyan-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Feature Flags
            </Link>
            <Link
              href="/admin/notifications/templates"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Templates
            </Link>
            <Link
              href="/admin/notifications/settings"
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Settings
            </Link>
          </nav>
        </div>
        
        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
