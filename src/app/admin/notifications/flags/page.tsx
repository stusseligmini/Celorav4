import NotificationFeatureFlagAdmin from "@/components/NotificationFeatureFlagAdmin";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notification Feature Flags | Celora Admin',
  description: 'Manage notification feature flags for the Celora platform',
};

export default function NotificationFlagsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Feature Flags</h1>
        <p className="text-gray-600">
          Configure and manage notification feature flags for the Celora platform.
        </p>
      </div>
      
      <NotificationFeatureFlagAdmin />
    </div>
  );
}