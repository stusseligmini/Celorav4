'use client';

import React, { useState } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'signin' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signIn, signUp } = useSupabase();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (activeTab === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Successfully signed in!');
          setTimeout(onClose, 1000);
        }
      } else {
        const { error } = await signUp(email, password, { full_name: fullName });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the confirmation link!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setMessage('');
  };

  const switchTab = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-card w-full max-w-md mx-4 shadow-neon">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-mono neon-text">
              {activeTab === 'signin' ? 'ACCESS TERMINAL' : 'CREATE USER'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-6 bg-dark-surface rounded-lg p-1 border border-dark-border">
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium font-mono transition-colors ${
                activeTab === 'signin'
                  ? 'bg-cyan-primary text-black shadow-neon-sm'
                  : 'text-gray-300 hover:text-cyan-primary'
              }`}
              onClick={() => switchTab('signin')}
            >
              LOGIN
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium font-mono transition-colors ${
                activeTab === 'signup'
                  ? 'bg-purple-glow text-black shadow-neon-purple-sm'
                  : 'text-gray-300 hover:text-purple-glow'
              }`}
              onClick={() => switchTab('signup')}
            >
              REGISTER
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-md">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded-md">
              <p className="text-sm text-green-300">{message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-cyan-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cyan-primary mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neon-input w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-md text-gray-100 placeholder-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cyan-primary mb-1">
                Password
              </label>
                <input
                  type="password"
                  autoComplete="current-password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neon-input w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-md text-gray-100 placeholder-gray-400"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              {activeTab === 'signup' && (
                <p className="text-xs text-gray-400 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-primary py-3 text-lg font-mono tracking-wide ${activeTab === 'signup' ? 'bg-purple-glow shadow-neon-purple' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  {activeTab === 'signin' ? 'ACCESSING SYSTEM...' : 'CREATING PROFILE...'}
                </div>
              ) : (
                activeTab === 'signin' ? 'ACCESS MATRIX' : 'JOIN THE MATRIX'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400 font-mono">
              {activeTab === 'signin' ? "NO ACCESS CREDENTIALS? " : "ALREADY REGISTERED? "}
              <button
                onClick={() => switchTab(activeTab === 'signin' ? 'signup' : 'signin')}
                className={activeTab === 'signin' ? "text-purple-glow hover:text-purple-accent font-medium underline transition-colors" : "text-cyan-primary hover:text-cyan-accent font-medium underline transition-colors"}
              >
                {activeTab === 'signin' ? 'CREATE ACCOUNT' : 'ACCESS SYSTEM'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}