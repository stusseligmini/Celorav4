"use client";
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authService } from '@/lib/auth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await authService.resetPassword(email);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-blue-950/20"></div>
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-mono font-bold text-cyan-400 mb-2">CELORA</h1>
            <p className="text-gray-400">Recover Your Account</p>
          </div>

          {success ? (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-mono font-bold text-green-400">Check Your Email</h2>
              <p className="text-gray-300 text-sm">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-gray-400 text-xs">
                If you don't see the email, check your spam folder or try again.
              </p>
              <Link 
                href="/signin"
                className="inline-block w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all text-center mt-4"
              >
                BACK TO SIGN IN
              </Link>
            </motion.div>
          ) : (
            /* Reset Form */
            <div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-cyan-400 mb-2">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="Enter your email address"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the email address associated with your account
                  </p>
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
                >
                  {loading ? 'SENDING RESET EMAIL...' : 'SEND RESET EMAIL'}
                </button>
              </form>

              {/* Important Notes */}
              <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
                <h3 className="text-yellow-400 font-mono font-bold text-sm mb-2">IMPORTANT:</h3>
                <ul className="text-yellow-400 text-xs space-y-1">
                  <li>• This only works for email accounts</li>
                  <li>• Seed phrase wallets cannot reset passwords</li>
                  <li>• Use your 12-word recovery phrase instead</li>
                </ul>
              </div>

              {/* Footer Links */}
              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <div className="flex justify-between text-sm">
                  <Link 
                    href="/signin" 
                    className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                  >
                    BACK TO SIGN IN
                  </Link>
                  <Link 
                    href="/signup" 
                    className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                  >
                    CREATE ACCOUNT
                  </Link>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
