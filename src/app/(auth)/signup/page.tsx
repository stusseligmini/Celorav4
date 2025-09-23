"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// BIP39 word list (simplified - first 100 words for demo)
const BIP39_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree',
  'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien',
  'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always',
  'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
  'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety',
  'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arcade', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest'
];

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [step, setStep] = useState<'create' | 'verify'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string[]>([]);
  const [verificationSeedPhrase, setVerificationSeedPhrase] = useState(Array(12).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate a new 12-word seed phrase
  const generateSeedPhrase = () => {
    const seedPhrase = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * BIP39_WORDS.length);
      seedPhrase.push(BIP39_WORDS[randomIndex]);
    }
    setGeneratedSeedPhrase(seedPhrase);
  };

  useEffect(() => {
    generateSeedPhrase();
  }, []);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('verify');
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Verify seed phrase
    const isCorrect = generatedSeedPhrase.every((word, index) => 
      word === verificationSeedPhrase[index].toLowerCase().trim()
    );

    if (!isCorrect) {
      setError('Seed phrase verification failed. Please check your words.');
      setLoading(false);
      return;
    }

    try {
      // Create SHA256 hash of seed phrase
      const phrase = generatedSeedPhrase.join(' ');
      const encoder = new TextEncoder();
      const data = encoder.encode(phrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Create account with seed phrase hash
      const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: walletEmail,
        password: hashHex,
        options: { 
          data: { 
            full_name: fullName,
            wallet_type: 'seed_phrase',
            public_email: email
          } 
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess('Wallet created successfully! You can now sign in with your seed phrase.');
        setTimeout(() => router.push('/signin'), 3000);
      }
    } catch (err) {
      setError('Failed to create wallet. Please try again.');
    }
    
    setLoading(false);
  };

  const handleVerificationWordChange = (index: number, value: string) => {
    const newPhrase = [...verificationSeedPhrase];
    newPhrase[index] = value.toLowerCase().trim();
    setVerificationSeedPhrase(newPhrase);
  };

  const copySeedPhrase = () => {
    navigator.clipboard.writeText(generatedSeedPhrase.join(' '));
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
            <p className="text-gray-400">
              {step === 'create' ? 'Create New Wallet' : 'Verify Seed Phrase'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-md">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-md">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Step 1: Create Wallet */}
          {step === 'create' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <form onSubmit={handleCreateWallet} className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-cyan-400 mb-2">FULL NAME</label>
                  <input
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-cyan-400 mb-2">EMAIL (OPTIONAL)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="your@email.com (for recovery)"
                  />
                </div>

                {/* Generated Seed Phrase Display */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-mono text-cyan-400">YOUR SEED PHRASE</label>
                    <button
                      type="button"
                      onClick={copySeedPhrase}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      COPY
                    </button>
                  </div>
                  <div className="bg-gray-800/70 border border-gray-600 rounded-md p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {generatedSeedPhrase.map((word, index) => (
                        <div key={index} className="bg-gray-700/50 rounded px-2 py-1 text-center">
                          <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                          <div className="text-sm text-white font-mono">{word}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
                    <p className="text-yellow-400 text-xs">
                      ⚠️ IMPORTANT: Write down these 12 words in order. This is the ONLY way to recover your wallet. Keep it secure and never share it.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all mt-6"
                >
                  I'VE SAVED MY SEED PHRASE
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Verify Seed Phrase */}
          {step === 'verify' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-cyan-400 mb-2">
                    VERIFY YOUR SEED PHRASE
                  </label>
                  <p className="text-xs text-gray-400 mb-4">
                    Enter your 12-word seed phrase to verify you've saved it correctly:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {verificationSeedPhrase.map((word, index) => (
                      <div key={index} className="relative">
                        <span className="absolute left-2 top-1 text-xs text-gray-500 font-mono">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={word}
                          onChange={e => handleVerificationWordChange(index, e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-2 pt-5 pb-2 text-white text-sm placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                          placeholder="word"
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep('create')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-mono py-3 px-4 rounded-md transition-all"
                  >
                    BACK
                  </button>
                  <button
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'CREATING...' : 'CREATE WALLET'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="text-center">
              <Link 
                href="/signin" 
                className="text-cyan-400 hover:text-cyan-300 font-mono text-sm transition-colors"
              >
                ALREADY HAVE A WALLET? SIGN IN
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
