import { WalletBackupPanel } from '@/components/WalletBackupPanel';

export const metadata = {
  title: 'Wallet Backup & Recovery | Celora',
  description: 'Backup and restore your Celora wallets and transaction history',
};

export default function WalletBackupPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-cyan-600">Wallet Backup & Recovery</h1>
      <WalletBackupPanel />
    </div>
  );
}