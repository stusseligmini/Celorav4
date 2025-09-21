'use client';

import { useState } from 'react';
import { CeloraWalletGenerator, WalletGenerationResult } from '../lib/walletGenerator';
import { supabase } from '../lib/supabase';
import { 
  Wallet, 
  Key, 
  Download, 
  Upload, 
  Shield, 
  Eye, 
  EyeOff,
  Copy,
  CheckCircle
} from 'lucide-react';

interface WalletCreationProps {
  onWalletCreated: (result: WalletGenerationResult) => void;
}

export default function WalletCreation({ onWalletCreated }: WalletCreationProps) {
  const [mode, setMode] = useState<'create' | 'import-seed' | 'import-key'>('create');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [blockchain, setBlockchain] = useState<'solana' | 'ethereum'>('solana');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedWallet, setGeneratedWallet] = useState<WalletGenerationResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreateWallet = async () => {
    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (masterPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await CeloraWalletGenerator.generateWallet(masterPassword);
      setGeneratedWallet(result);
      
      // Save to Supabase (you'll implement this)
      await saveWalletToDatabase(result, masterPassword);
      
      onWalletCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSeed = async () => {
    if (!seedPhrase.trim()) {
      setError('Please enter your seed phrase');
      return;
    }

    if (masterPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await CeloraWalletGenerator.importFromSeedPhrase(seedPhrase.trim(), masterPassword);
      setGeneratedWallet(result);
      
      await saveWalletToDatabase(result, masterPassword);
      
      onWalletCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPrivateKey = async () => {
    if (!privateKey.trim()) {
      setError('Please enter your private key');
      return;
    }

    if (masterPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await CeloraWalletGenerator.importFromPrivateKey(
        privateKey.trim(), 
        blockchain, 
        masterPassword
      );
      
      // This will be a partial result, handle accordingly
      onWalletCreated(result as WalletGenerationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import private key');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWalletToDatabase = async (result: WalletGenerationResult, password: string) => {
    // Implementation for saving encrypted wallet data to Supabase
    // This is where you'd save the encrypted keys to your database
    console.log('Saving wallet to database...', result);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (generatedWallet) {
    return (
      <div className="min-h-screen bg-[#041c24] flex items-center justify-center p-4">
        <div className="bg-[#062830]/70 backdrop-blur-md rounded-3xl p-8 max-w-4xl w-full border border-primary/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Wallet Created Successfully!</h1>
            <p className="text-primary/70">Your multi-chain wallet has been generated securely</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Solana Wallet */}
            <div className="bg-[#041c24] rounded-xl p-6 border border-primary/10">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
                Solana Wallet
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-primary/70 text-sm">Public Address</label>
                  <div className="flex items-center bg-[#062830] rounded-lg p-3 mt-1">
                    <code className="text-primary text-sm flex-1 break-all">
                      {generatedWallet.solanaWallet.publicKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedWallet.solanaWallet.publicKey, 'solana-address')}
                      className="ml-2 p-1 text-primary/70 hover:text-primary"
                    >
                      {copied === 'solana-address' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ethereum Wallet */}
            <div className="bg-[#041c24] rounded-xl p-6 border border-primary/10">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">E</span>
                </div>
                Ethereum Wallet
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-primary/70 text-sm">Address</label>
                  <div className="flex items-center bg-[#062830] rounded-lg p-3 mt-1">
                    <code className="text-primary text-sm flex-1 break-all">
                      {generatedWallet.ethereumWallet.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedWallet.ethereumWallet.address, 'eth-address')}
                      className="ml-2 p-1 text-primary/70 hover:text-primary"
                    >
                      {copied === 'eth-address' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seed Phrase */}
          {generatedWallet.seedPhrase && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center">
                <Shield className="w-6 h-6 mr-2" />
                Backup Your Seed Phrase
              </h3>
              <p className="text-red-300 text-sm mb-4">
                Write down these 24 words in order and store them safely. This is the only way to recover your wallet.
              </p>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                {generatedWallet.seedPhrase.split(' ').map((word, index) => (
                  <div key={index} className="bg-[#041c24] rounded-lg p-2 text-center">
                    <span className="text-primary/70 text-xs">{index + 1}</span>
                    <div className="text-primary font-medium">{word}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => copyToClipboard(generatedWallet.seedPhrase!, 'seed-phrase')}
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {copied === 'seed-phrase' ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Seed Phrase
              </button>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-white py-3 px-6 rounded-xl font-semibold transition-all"
          >
            Continue to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#041c24] flex items-center justify-center p-4">
      <div className="bg-[#062830]/70 backdrop-blur-md rounded-3xl p-8 max-w-lg w-full border border-primary/20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Create Your Celora Wallet</h1>
          <p className="text-primary/70">Secure multi-chain wallet for Solana and Ethereum</p>
        </div>

        {/* Mode Selection */}
        <div className="flex mb-6 bg-[#041c24] rounded-xl p-1">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'create' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setMode('import-seed')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'import-seed' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            Import Seed
          </button>
          <button
            onClick={() => setMode('import-key')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'import-key' 
                ? 'bg-gradient-to-r from-primary to-secondary text-white' 
                : 'text-primary/70 hover:text-primary'
            }`}
          >
            Import Key
          </button>
        </div>

        {/* Master Password */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-primary text-sm font-medium mb-2">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary/70 hover:text-primary"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-primary text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Import Fields */}
        {mode === 'import-seed' && (
          <div className="mb-6">
            <label className="block text-primary text-sm font-medium mb-2">
              Seed Phrase (12 or 24 words)
            </label>
            <textarea
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              placeholder="Enter your seed phrase separated by spaces"
              rows={3}
              className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        )}

        {mode === 'import-key' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-primary text-sm font-medium mb-2">
                Blockchain
              </label>
              <select
                value={blockchain}
                onChange={(e) => setBlockchain(e.target.value as 'solana' | 'ethereum')}
                className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="solana">Solana</option>
                <option value="ethereum">Ethereum</option>
              </select>
            </div>
            <div>
              <label className="block text-primary text-sm font-medium mb-2">
                Private Key
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your private key"
                className="w-full bg-[#041c24] border border-primary/20 rounded-lg px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={
            mode === 'create' ? handleCreateWallet :
            mode === 'import-seed' ? handleImportSeed :
            handleImportPrivateKey
          }
          disabled={isLoading || !masterPassword}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <>
              {mode === 'create' && <Key className="w-5 h-5 mr-2" />}
              {mode === 'import-seed' && <Download className="w-5 h-5 mr-2" />}
              {mode === 'import-key' && <Upload className="w-5 h-5 mr-2" />}
            </>
          )}
          {isLoading ? 'Processing...' : 
           mode === 'create' ? 'Create Wallet' :
           mode === 'import-seed' ? 'Import from Seed' :
           'Import from Private Key'}
        </button>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-primary/70 text-xs text-center">
            Your wallet will be encrypted with your master password and stored securely. 
            Make sure to remember your password - it cannot be recovered.
          </p>
        </div>
      </div>
    </div>
  );
}