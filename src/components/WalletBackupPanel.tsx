'use client';

import React, { useState, useEffect } from 'react';
import { useWalletBackup, WalletBackup, BackupOptions, RestoreOptions, BackupScheduleOptions } from '@/hooks/useWalletBackup';
import { format } from 'date-fns';

const BackupStatusBadge = ({ status }: { status: string }) => {
  let bgColor;
  
  switch (status) {
    case 'success':
      bgColor = 'bg-green-100 text-green-800';
      break;
    case 'pending':
      bgColor = 'bg-yellow-100 text-yellow-800';
      break;
    case 'failed':
      bgColor = 'bg-red-100 text-red-800';
      break;
    default:
      bgColor = 'bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
      {status}
    </span>
  );
};

export function WalletBackupPanel() {
  const [backups, setBackups] = useState<WalletBackup[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<WalletBackup | null>(null);
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeTransactions: true,
  });
  const [scheduleOptions, setScheduleOptions] = useState<BackupScheduleOptions>({
    schedule: 'weekly',
    includeTransactions: true,
  });
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    overwriteExisting: false,
    restoreTransactions: true,
  });
  
  const { 
    createBackup, 
    getBackups, 
    restoreBackup, 
    createBackupSchedule, 
    getBackupSchedules,
    loading, 
    error 
  } = useWalletBackup();
  
  // Load backups and schedules on mount
  useEffect(() => {
    loadBackups();
    loadSchedules();
  }, []);
  
  const loadBackups = async () => {
    try {
      const backupData = await getBackups();
      setBackups(backupData || []);
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  };
  
  const loadSchedules = async () => {
    try {
      const scheduleData = await getBackupSchedules();
      setSchedules(scheduleData || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };
  
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await createBackup(backupOptions);
      loadBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  const handleCreateSchedule = async () => {
    setIsCreatingSchedule(true);
    try {
      await createBackupSchedule(scheduleOptions);
      loadSchedules();
    } catch (error) {
      console.error('Error creating backup schedule:', error);
    } finally {
      setIsCreatingSchedule(false);
    }
  };
  
  const handleOpenRestoreModal = (backup: WalletBackup) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };
  
  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    try {
      const result = await restoreBackup(selectedBackup.id, restoreOptions);
      console.log('Restore result:', result);
      setShowRestoreModal(false);
    } catch (error) {
      console.error('Error restoring backup:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Wallet Backup</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-3">Create New Backup</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeTransactions"
                checked={backupOptions.includeTransactions}
                onChange={(e) => setBackupOptions({
                  ...backupOptions,
                  includeTransactions: e.target.checked
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="includeTransactions" className="ml-2 text-sm text-gray-700">
                Include transaction history
              </label>
            </div>
            
            <button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isCreatingBackup ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Backup History</h3>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          {backups.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No backups found</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallets
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(backup.timestamp), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.walletCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.transactionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.round(backup.size / 1024)} KB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenRestoreModal(backup)}
                        className="text-cyan-600 hover:text-cyan-800"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Backup Schedule</h3>
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">
                Frequency
              </label>
              <select
                id="schedule"
                value={scheduleOptions.schedule}
                onChange={(e) => setScheduleOptions({
                  ...scheduleOptions,
                  schedule: e.target.value as 'daily' | 'weekly' | 'monthly'
                })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="scheduleIncludeTransactions"
                checked={scheduleOptions.includeTransactions}
                onChange={(e) => setScheduleOptions({
                  ...scheduleOptions,
                  includeTransactions: e.target.checked
                })}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <label htmlFor="scheduleIncludeTransactions" className="ml-2 text-sm text-gray-700">
                Include transaction history
              </label>
            </div>
            
            <button
              onClick={handleCreateSchedule}
              disabled={isCreatingSchedule || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isCreatingSchedule ? 'Creating...' : 'Set Schedule'}
            </button>
          </div>
        </div>
        
        {schedules.length > 0 && (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.schedule.charAt(0).toUpperCase() + schedule.schedule.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(schedule.next_run), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <BackupStatusBadge status={schedule.is_active ? 'active' : 'disabled'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Modal */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3">
                      Restore Backup
                    </h3>
                    <div className="mt-2 space-y-4">
                      <p className="text-sm text-gray-500">
                        Restore from backup created on {format(new Date(selectedBackup.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="overwriteExisting"
                          checked={restoreOptions.overwriteExisting}
                          onChange={(e) => setRestoreOptions({
                            ...restoreOptions,
                            overwriteExisting: e.target.checked
                          })}
                          className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                        />
                        <label htmlFor="overwriteExisting" className="ml-2 text-sm text-gray-700">
                          Overwrite existing wallets
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="restoreTransactions"
                          checked={restoreOptions.restoreTransactions}
                          onChange={(e) => setRestoreOptions({
                            ...restoreOptions,
                            restoreTransactions: e.target.checked
                          })}
                          className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                        />
                        <label htmlFor="restoreTransactions" className="ml-2 text-sm text-gray-700">
                          Restore transactions
                        </label>
                      </div>
                      
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              Warning: Restoring a backup may overwrite current wallet data. Make sure you understand the implications.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleRestore}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-600 text-base font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}