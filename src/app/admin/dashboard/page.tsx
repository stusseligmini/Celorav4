import AdvancedAdminDashboard from '@/components/AdvancedAdminDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Celora',
  description: 'Advanced administration dashboard for system monitoring and management',
  themeColor: '#0f172a',
};

export default function AdminDashboardPage() {
  return <AdvancedAdminDashboard />;
}