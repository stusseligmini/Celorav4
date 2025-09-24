'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '@/lib/auth';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 Creating account with email and password...');
      const result = await authService.signUpWithEmail(email, password, fullName);
      
      if (result.success) {
        setSuccess('🎉 Account created successfully! Welcome to Celora!');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Account creation error:', err);
      setError('Network error. Please check your connection and try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
              CELORA
            </h1>
            <p className="text-gray-400">Create Your Account</p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md"
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-md"
              >
                <p className="text-green-400 text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="Choose a strong password"
                disabled={loading}
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="Repeat your password"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'CREATE ACCOUNT'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/signin" 
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <h3 className="text-blue-400 font-medium text-sm mb-2">🔒 Professional Security</h3>
            <p className="text-gray-400 text-xs">
              After creating your account, you'll have the option to set up a 12-word 
              seed phrase backup for ultimate security. This follows industry best practices 
              for professional fintech platforms.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}