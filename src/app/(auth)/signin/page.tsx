"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '@/lib/auth';
import { validateSeedPhrase, BIP39_WORDS } from '@/lib/seedPhrase';

export default function SignInPage() {
  const router = useRouter();
  
  const [authMethod, setAuthMethod] = useState<'email' | 'seedphrase'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState(Array(12).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedPhraseInput, setSeedPhraseInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Auto-complete suggestions for seed phrase
  useEffect(() => {
    if (showSuggestions !== null && seedPhrase[showSuggestions]) {
      const currentWord = seedPhrase[showSuggestions].toLowerCase();
      if (currentWord.length > 0) {
        const filtered = BIP39_WORDS.filter(word => 
          word.startsWith(currentWord)
        ).slice(0, 5);
        setSuggestions(filtered);
      } else {
        setSuggestions([]);
      }
    }
  }, [seedPhrase, showSuggestions]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const result = await authService.signInWithEmail(email, password);
    
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleSeedPhraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate seed phrase
    if (!validateSeedPhrase(seedPhrase)) {
      setError('Please enter a valid 12-word seed phrase');
      setLoading(false);
      return;
    }

    const result = await authService.signInWithSeedPhrase(seedPhrase);
    
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handlePasteSeedPhrase = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const words = text.trim().split(/\s+/);
      
      if (words.length === 12) {
        setSeedPhrase(words.slice(0, 12));
        setError(null);
      } else {
        setError('Clipboard must contain exactly 12 words');
      }
    } catch (err) {
      setError('Failed to read from clipboard');
    }
  };

  const handleSeedWordChange = (index: number, value: string) => {
    const newSeedPhrase = [...seedPhrase];
    newSeedPhrase[index] = value.toLowerCase().trim();
    setSeedPhrase(newSeedPhrase);
    
    // Show suggestions for this field
    if (value.length > 0) {
      setShowSuggestions(index);
    } else {
      setShowSuggestions(null);
    }
  };

  const selectSuggestion = (index: number, word: string) => {
    const newSeedPhrase = [...seedPhrase];
    newSeedPhrase[index] = word;
    setSeedPhrase(newSeedPhrase);
    setShowSuggestions(null);
    
    // Focus next input
    if (index < 11) {
      const nextInput = document.getElementById(`seed-${index + 1}`);
      nextInput?.focus();
    }
  };

  const clearSeedPhrase = () => {
    setSeedPhrase(Array(12).fill(''));
    setError(null);
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
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-mono text-cyan-400">
                    12-WORD SEED PHRASE
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handlePasteSeedPhrase}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                    >
                      PASTE
                    </button>
                    <button
                      type="button"
                      onClick={clearSeedPhrase}
                      className="text-xs text-gray-400 hover:text-gray-300 font-mono transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 relative">
                  {seedPhrase.map((word, index) => (
                    <div key={index} className="relative">
                      <span className="absolute left-2 top-1 text-xs text-gray-500 font-mono z-10">
                        {index + 1}
                      </span>
                      <input
                        id={`seed-${index}`}
                        type="text"
                        value={word}
                        onChange={e => handleSeedWordChange(index, e.target.value)}
                        onFocus={() => setShowSuggestions(index)}
                        onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        className={`w-full bg-gray-800/50 border rounded-md px-2 pt-5 pb-2 text-white text-sm placeholder-gray-400 focus:outline-none transition-all ${
                          word && BIP39_WORDS.includes(word.toLowerCase())
                            ? 'border-green-500/50 focus:border-green-400'
                            : word && word.length > 0
                            ? 'border-red-500/50 focus:border-red-400'
                            : 'border-gray-600 focus:border-cyan-400'
                        }`}
                        placeholder="word"
                        autoComplete="off"
                      />
                      
                      {/* Auto-complete suggestions */}
                      <AnimatePresence>
                        {showSuggestions === index && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 z-20 bg-gray-800 border border-gray-600 rounded-md mt-1 max-h-32 overflow-y-auto"
                          >
                            {suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectSuggestion(index, suggestion)}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-cyan-400/20 hover:text-cyan-400 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                
                {/* Validation feedback */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {seedPhrase.filter(w => w && BIP39_WORDS.includes(w.toLowerCase())).length}/12 valid words
                    </span>
                    <span className="text-gray-400">
                      {seedPhrase.filter(w => w.trim()).length}/12 filled
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(seedPhrase.filter(w => w && BIP39_WORDS.includes(w.toLowerCase())).length / 12) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  Enter your 12-word recovery phrase in the correct order. Words will auto-complete and validate as you type.
                </p>
              </div>
              
              <button
                disabled={loading || !validateSeedPhrase(seedPhrase)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
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
