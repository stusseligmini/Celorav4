import React from 'react';
import Link from 'next/link';
import { WalletOverview } from '@/components/WalletOverview';

export const metadata = {
  title: 'Wallets | Celora',
  description: 'Manage your Celora wallets',
};

export default function WalletsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-cyan-600">Wallet Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <WalletOverview />
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h2>
              <div className="space-y-4">
                <Link href="/wallet/backup" className="flex items-center p-3 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors">
                  <div className="rounded-full bg-cyan-100 p-2 mr-3">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Backup & Recovery</h3>
                    <p className="text-sm text-gray-600">Create backups and restore your wallets</p>
                  </div>
                </Link>
                <button className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full text-left">
                  <div className="rounded-full bg-gray-100 p-2 mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Create New Wallet</h3>
                    <p className="text-sm text-gray-600">Add a new wallet to your account</p>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Wallet Security</h2>
              <div className="space-y-4">
                <button className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full text-left">
                  <div className="rounded-full bg-gray-100 p-2 mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Security Settings</h3>
                    <p className="text-sm text-gray-600">Configure wallet security options</p>
                  </div>
                </button>
                <button className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full text-left">
                  <div className="rounded-full bg-gray-100 p-2 mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Recovery Options</h3>
                    <p className="text-sm text-gray-600">Setup wallet recovery options</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Recent Transactions</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center py-8">No recent transactions</p>
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              View All Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
