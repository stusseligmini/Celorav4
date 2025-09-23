"use client";
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [authMethod, setAuthMethod] = useState<'email' | 'seedphrase'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState(Array(12).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  const handleSeedPhraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate seed phrase (all 12 words filled)
    const phrase = seedPhrase.join(' ').trim();
    if (seedPhrase.some(word => !word.trim()) || seedPhrase.length !== 12) {
      setError('Please enter all 12 seed phrase words');
      setLoading(false);
      return;
    }

    // Create SHA256 hash of seed phrase
    const encoder = new TextEncoder();
    const data = encoder.encode(phrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Use seed phrase hash as password for authentication
    const { error } = await supabase.auth.signInWithPassword({ 
      email: `${hashHex.slice(0, 16)}@celora.wallet`, 
      password: hashHex 
    });
    
    if (error) {
      setError('Invalid seed phrase or wallet not found');
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  const handleSeedWordChange = (index: number, value: string) => {
    const newSeedPhrase = [...seedPhrase];
    newSeedPhrase[index] = value.toLowerCase().trim();
    setSeedPhrase(newSeedPhrase);
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
            <p className="text-gray-400">Access Your Wallet</p>
          </div>

          {/* Auth Method Selector */}
          <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-mono transition-all ${
                authMethod === 'email'
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              EMAIL LOGIN
            </button>
            <button
              onClick={() => setAuthMethod('seedphrase')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-mono transition-all ${
                authMethod === 'seedphrase'
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              SEED PHRASE
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Email Login Form */}
          {authMethod === 'email' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleEmailSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-mono text-cyan-400 mb-2">EMAIL</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-cyan-400 mb-2">PASSWORD</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  placeholder="Enter your password"
                />
              </div>
              <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </motion.form>
          )}

          {/* Seed Phrase Login Form */}
          {authMethod === 'seedphrase' && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSeedPhraseSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-mono text-cyan-400 mb-2">
                  12-WORD SEED PHRASE
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {seedPhrase.map((word, index) => (
                    <div key={index} className="relative">
                      <span className="absolute left-2 top-1 text-xs text-gray-500 font-mono">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={word}
                        onChange={e => handleSeedWordChange(index, e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-2 pt-5 pb-2 text-white text-sm placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                        placeholder="word"
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Enter your 12-word recovery phrase in the correct order
                </p>
              </div>
              <button
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
              >
                {loading ? 'ACCESSING WALLET...' : 'ACCESS WALLET'}
              </button>
            </motion.form>
          )}

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="flex justify-between text-sm">
              <Link 
                href="/signup" 
                className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
              >
                CREATE WALLET
              </Link>
              <Link 
                href="/reset-password" 
                className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
              >
                RECOVER WALLET
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
