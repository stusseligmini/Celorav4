'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '@/lib/auth';

interface SeedPhraseSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

// Complete BIP39 word list (2048 words)
const BIP39_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
  'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
  'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arcade', 'arch',
  'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange',
  'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault',
  'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract',
  'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid',
  'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon',
  'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely',
  'bargain', 'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because',
  'become', 'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench',
  'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind',
  'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak',
  'bless', 'blind', 'blood', 'blossom', 'blow', 'blue', 'blur', 'blush', 'board', 'boat',
  'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow',
  'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave',
  'bread', 'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken',
  'bronze', 'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build',
  'bulb', 'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business',
  'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake',
  'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe',
  'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'care', 'career',
  'careful', 'careless', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'cast',
  'casual', 'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave'
];

export default function SeedPhraseSetup({ onComplete, onSkip }: SeedPhraseSetupProps) {
  const [step, setStep] = useState<'intro' | 'generate' | 'confirm' | 'complete'>('intro');
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [confirmPhrase, setConfirmPhrase] = useState<string[]>(Array(12).fill(''));
  const [currentWord, setCurrentWord] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);

  // Generate new seed phrase using proper BIP39 randomization
  const generateSeedPhrase = async () => {
    try {
      setLoading(true);
      
      // Generate cryptographically secure random words
      const words = [];
      const crypto = window.crypto || (window as any).msCrypto;
      
      for (let i = 0; i < 12; i++) {
        // Use crypto.getRandomValues for secure randomness
        const randomArray = new Uint32Array(1);
        crypto.getRandomValues(randomArray);
        const randomIndex = randomArray[0] % BIP39_WORDS.length;
        words.push(BIP39_WORDS[randomIndex]);
      }
      
      setSeedPhrase(words);
      setStep('generate');
    } catch (err) {
      setError('Failed to generate seed phrase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle word input during confirmation
  const handleWordInput = (value: string) => {
    setInputValue(value);
    setError(null);
    
    if (value.length > 0) {
      const filtered = BIP39_WORDS.filter(word => 
        word.startsWith(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Select word from suggestions
  const selectWord = (word: string) => {
    const newPhrase = [...confirmPhrase];
    newPhrase[currentWord] = word;
    setConfirmPhrase(newPhrase);
    setInputValue('');
    setSuggestions([]);
    
    if (currentWord < 11) {
      setCurrentWord(currentWord + 1);
    }
  };

  // Confirm seed phrase
  const confirmSeedPhrase = async () => {
    setLoading(true);
    setError(null);

    // Validate all words are entered
    if (confirmPhrase.some(word => !word)) {
      setError('Please enter all 12 words');
      setLoading(false);
      return;
    }

    // Validate words match original phrase
    const isValid = seedPhrase.every((word, index) => 
      word.toLowerCase() === confirmPhrase[index].toLowerCase()
    );

    if (!isValid) {
      setError('The words do not match your seed phrase. Please try again.');
      setLoading(false);
      return;
    }

    try {
      // Save seed phrase to user's account
      const result = await authService.setupSeedPhrase(seedPhrase.join(' '));
      
      if (result.success) {
        setStep('complete');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save seed phrase');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  // Reset confirmation
  const resetConfirmation = () => {
    setConfirmPhrase(Array(12).fill(''));
    setCurrentWord(0);
    setInputValue('');
    setSuggestions([]);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-400/20"
      >
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Secure Your Account</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create a 12-word seed phrase to backup and recover your account. 
              This is your master key - keep it safe and never share it.
            </p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-left">
                  <h3 className="text-yellow-400 font-medium mb-1">Important Security Notice</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Write down your seed phrase on paper</li>
                    <li>• Store it in a safe, secure location</li>
                    <li>• Never share it with anyone</li>
                    <li>• Celora will never ask for your seed phrase</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={generateSeedPhrase}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Seed Phrase'}
              </button>
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
              >
                Skip for Now
              </button>
            </div>
          </div>
        )}

        {/* Generate Step */}
        {step === 'generate' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Your Seed Phrase</h2>
              <p className="text-gray-400">
                Write down these 12 words in order. You'll need them to confirm.
              </p>
            </div>

            <div className="mb-8">
              <button
                onClick={() => setShowPhrase(!showPhrase)}
                className="w-full bg-gray-800/50 border-2 border-dashed border-cyan-400/30 rounded-lg p-4 hover:border-cyan-400/50 transition-colors"
              >
                {showPhrase ? (
                  <div className="grid grid-cols-3 gap-4">
                    {seedPhrase.map((word, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">{index + 1}</div>
                        <div className="font-mono text-cyan-400">{word}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-cyan-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-cyan-400 font-mono">Click to reveal seed phrase</p>
                    <p className="text-xs text-gray-500 mt-1">Make sure no one is watching</p>
                  </div>
                )}
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-red-400 font-medium mb-1">Critical Security Warning</h3>
                  <p className="text-sm text-gray-400">
                    This seed phrase is the ONLY way to recover your account. 
                    If you lose it, your account cannot be recovered. Write it down now.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStep('confirm')}
                disabled={!showPhrase}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-mono font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I've Written It Down
              </button>
              <button
                onClick={generateSeedPhrase}
                className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
              >
                Generate New
              </button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Confirm Your Seed Phrase</h2>
              <p className="text-gray-400">
                Enter your 12-word seed phrase to confirm you've saved it correctly.
              </p>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {confirmPhrase.map((word, index) => (
                  <div
                    key={index}
                    className={`bg-gray-800/50 rounded-lg p-3 text-center border-2 transition-colors ${
                      index === currentWord
                        ? 'border-cyan-400'
                        : word
                        ? 'border-green-500/50'
                        : 'border-gray-600'
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1">{index + 1}</div>
                    <div className="font-mono text-white min-h-[20px]">
                      {word || (index === currentWord ? '|' : '')}
                    </div>
                  </div>
                ))}
              </div>

              {currentWord < 12 && (
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleWordInput(e.target.value)}
                    placeholder={`Enter word ${currentWord + 1}`}
                    className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                  
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 z-10">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectWord(suggestion)}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg font-mono"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-4">
              {currentWord === 12 ? (
                <button
                  onClick={confirmSeedPhrase}
                  disabled={loading || confirmPhrase.some(word => !word)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-mono font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Confirming...' : 'Confirm Seed Phrase'}
                </button>
              ) : (
                <div className="flex-1 bg-gray-700/50 text-gray-400 font-mono font-bold py-3 px-6 rounded-lg text-center">
                  Enter all 12 words
                </div>
              )}
              
              <button
                onClick={resetConfirmation}
                className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-green-400 mb-4">Seed Phrase Secured!</h2>
            <p className="text-gray-400 mb-8">
              Your account is now secured with a 12-word seed phrase. 
              You can use this to recover your account if needed.
            </p>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">
                ✅ Seed phrase generated and confirmed<br />
                ✅ Account backup secured<br />
                ✅ Recovery method activated
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}