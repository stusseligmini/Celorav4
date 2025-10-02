'use client';

/**
 * MFA Recovery Admin Dashboard Component
 * 
 * This component allows administrators to manage MFA recovery requests.
 * It displays pending, approved, rejected, and completed requests with
 * filtering and searching capabilities.
 */

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { Database } from '@/lib/database.types';

// Type definitions
type RecoveryRequest = {
  id: string;
  case_number: string;
  user_id: string | null;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  request_data: {
    personalInfo: {
      fullName: string;
      dateOfBirth: string;
      lastFourDigits: string;
    };
  };
  reviewer_id: string | null;
  review_notes: string | null;
};

type RecoveryStats = {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  completed_requests: number;
  average_resolution_time_hours: number;
};

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';

// Component
const MfaRecoveryAdminDashboard: React.FC = () => {
  // State
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RecoveryRequest[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const supabase = getSupabaseClient() as any;

  // Fetch recovery requests
  useEffect(() => {
    async function fetchRecoveryRequests() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('mfa_recovery_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setRequests(data as RecoveryRequest[]);
        applyFilters(data as RecoveryRequest[], filter, search);
        
        // Fetch statistics
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_mfa_recovery_statistics');
        
        if (statsError) {
          throw statsError;
        }
        
        setStats(statsData as RecoveryStats);
      } catch (err: any) {
        console.error('Error fetching recovery requests:', err);
        setError(err.message || 'Failed to load recovery requests');
      } finally {
        setLoading(false);
      }
    }

    fetchRecoveryRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('mfa_recovery_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'mfa_recovery_requests' 
        },
        () => {
          fetchRecoveryRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Apply filters when filter or search changes
  useEffect(() => {
    applyFilters(requests, filter, search);
  }, [filter, search, requests]);

  // Filter and search function
  const applyFilters = (data: RecoveryRequest[], currentFilter: Filter, searchTerm: string) => {
    let result = [...data];
    
    // Apply status filter
    if (currentFilter !== 'all') {
      result = result.filter(req => req.status === currentFilter);
    }
    
    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(req => 
        req.case_number.toLowerCase().includes(lowerSearch) ||
        req.email.toLowerCase().includes(lowerSearch) ||
        (req.request_data.personalInfo.fullName && req.request_data.personalInfo.fullName.toLowerCase().includes(lowerSearch))
      );
    }
    
    setFilteredRequests(result);
  };

  // Handle request selection
  const handleSelectRequest = (request: RecoveryRequest) => {
    setSelectedRequest(request);
    setReviewNotes(request.review_notes || '');
  };

  // Handle status updates
  const updateRequestStatus = async (status: 'approved' | 'rejected' | 'completed') => {
    if (!selectedRequest) return;
    
    try {
      setActionInProgress(true);
      
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      let success = false;
      
      if (status === 'completed') {
        // Call RPC function for completing recovery
        const { data, error } = await supabase
          .rpc('complete_mfa_recovery', {
            p_case_number: selectedRequest.case_number,
            p_admin_id: user.id
          });
          
        if (error) throw error;
        success = !!data;
      } else {
        // Call RPC function for updating status
        const { data, error } = await supabase
          .rpc('update_recovery_request_status', {
            p_case_number: selectedRequest.case_number,
            p_status: status,
            p_reviewer_id: user.id,
            p_review_notes: reviewNotes
          });
          
        if (error) throw error;
        success = !!data;
      }
      
      if (!success) {
        throw new Error('Failed to update request status');
      }
      
      // Close the details view
      setSelectedRequest(null);
      setReviewNotes('');
      
    } catch (err: any) {
      console.error('Error updating request status:', err);
      setError(err.message || 'Failed to update request');
    } finally {
      setActionInProgress(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Calculate time difference in hours
  const calculateTimeDiff = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(1);
  };

  // Render stats section
  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800/70 rounded-lg p-4 shadow-md flex flex-col">
          <span className="text-sm text-gray-400">Total Requests</span>
          <span className="text-2xl font-bold text-white">{stats.total_requests}</span>
        </div>
        
        <div className="bg-yellow-800/30 rounded-lg p-4 shadow-md flex flex-col">
          <span className="text-sm text-yellow-300/70">Pending</span>
          <span className="text-2xl font-bold text-yellow-300">{stats.pending_requests}</span>
        </div>
        
        <div className="bg-green-800/30 rounded-lg p-4 shadow-md flex flex-col">
          <span className="text-sm text-green-300/70">Approved</span>
          <span className="text-2xl font-bold text-green-300">{stats.approved_requests}</span>
        </div>
        
        <div className="bg-red-800/30 rounded-lg p-4 shadow-md flex flex-col">
          <span className="text-sm text-red-300/70">Rejected</span>
          <span className="text-2xl font-bold text-red-300">{stats.rejected_requests}</span>
        </div>
        
        <div className="bg-blue-800/30 rounded-lg p-4 shadow-md flex flex-col">
          <span className="text-sm text-blue-300/70">Avg. Resolution Time</span>
          <span className="text-2xl font-bold text-blue-300">
            {stats.average_resolution_time_hours ? `${stats.average_resolution_time_hours.toFixed(1)}h` : 'N/A'}
          </span>
        </div>
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    return (
      <div className="flex flex-col md:flex-row justify-between mb-6">
        <div className="flex space-x-2 mb-4 md:mb-0 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            All
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search case number or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    );
  };

  // Render requests table
  const renderRequestsTable = () => {
    if (loading) {
      return <div className="text-center py-8">Loading recovery requests...</div>;
    }
    
    if (error) {
      return (
        <div className="text-center py-8 text-red-400">
          <p>{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-700 rounded-md text-white"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      );
    }
    
    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No recovery requests found matching your criteria.
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800/70 rounded-lg overflow-hidden">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Case Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-white">{request.case_number}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{request.email}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-yellow-800/50 text-yellow-300' :
                    request.status === 'approved' ? 'bg-green-800/50 text-green-300' :
                    request.status === 'rejected' ? 'bg-red-800/50 text-red-300' :
                    'bg-blue-800/50 text-blue-300'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(request.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{formatDate(request.updated_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                  <button
                    onClick={() => handleSelectRequest(request)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render request details modal
  const renderRequestDetails = () => {
    if (!selectedRequest) return null;
    
    const { personalInfo } = selectedRequest.request_data;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Recovery Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Case Number</span>
                  <span className="font-mono text-lg text-cyan-400">{selectedRequest.case_number}</span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Email</span>
                  <span className="text-white">{selectedRequest.email}</span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedRequest.status === 'pending' ? 'bg-yellow-800/50 text-yellow-300' :
                    selectedRequest.status === 'approved' ? 'bg-green-800/50 text-green-300' :
                    selectedRequest.status === 'rejected' ? 'bg-red-800/50 text-red-300' :
                    'bg-blue-800/50 text-blue-300'
                  }`}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">User ID</span>
                  <span className="text-white">{selectedRequest.user_id || 'Not linked to user'}</span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Request Time</span>
                  <span className="text-white">{formatDate(selectedRequest.created_at)}</span>
                </div>
                
                {selectedRequest.status !== 'pending' && (
                  <div className="mb-4">
                    <span className="block text-sm text-gray-400">Last Updated</span>
                    <span className="text-white">{formatDate(selectedRequest.updated_at)}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      ({calculateTimeDiff(selectedRequest.created_at, selectedRequest.updated_at)}h)
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Full Name (Provided)</span>
                  <span className="text-white">{personalInfo?.fullName || 'Not provided'}</span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Date of Birth</span>
                  <span className="text-white">{personalInfo?.dateOfBirth || 'Not provided'}</span>
                </div>
                
                <div className="mb-4">
                  <span className="block text-sm text-gray-400">Last 4 Digits of Card</span>
                  <span className="text-white">****{personalInfo?.lastFourDigits || 'Not provided'}</span>
                </div>
                
                {selectedRequest.reviewer_id && (
                  <div className="mb-4">
                    <span className="block text-sm text-gray-400">Reviewed By</span>
                    <span className="text-white">{selectedRequest.reviewer_id}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="review-notes" className="block text-sm text-gray-400 mb-1">
                Review Notes
              </label>
              <textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                disabled={selectedRequest.status === 'completed'}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none resize-none h-24"
                placeholder="Add notes about this recovery request..."
              />
            </div>
            
            {selectedRequest.status === 'pending' && (
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <button
                  onClick={() => updateRequestStatus('approved')}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : 'Approve Request'}
                </button>
                
                <button
                  onClick={() => updateRequestStatus('rejected')}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            )}
            
            {selectedRequest.status === 'approved' && (
              <div>
                <button
                  onClick={() => updateRequestStatus('completed')}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : 'Complete Recovery Process'}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  This will disable MFA for the user and remove all MFA factors and recovery codes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-white mb-8">MFA Recovery Management</h2>
      
      {renderStats()}
      {renderFilters()}
      {renderRequestsTable()}
      {renderRequestDetails()}
    </div>
  );
};

export default MfaRecoveryAdminDashboard;
