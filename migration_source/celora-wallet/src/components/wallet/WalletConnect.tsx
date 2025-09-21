'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase } from '@/lib/supabase';

export default function WalletConnect() {
  const { publicKey, signMessage } = useWallet();
  const { user } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const linkWallet = async () => {
    if (!publicKey || !signMessage || !user) return;

    setLoading(true);
    setError(null);
    setSuccess('');

    try {
      // Generer en melding som inneholder bruker-ID og en tidsstempel
      const message = `Link Solana wallet to Celora account: ${user.id} at ${new Date().toISOString()}`;
      
      // Konverter meldingen til bytes for signering
      const messageBytes = new TextEncoder().encode(message);
      
      // Be brukeren om å signere meldingen med sin Solana-lommebok
      const signature = await signMessage(messageBytes);
      
      // Lagre den signerte Solana-lommeboken i Supabase
      const { error } = await supabase
        .from('wallets')
        .upsert({
          user_id: user.id,
          wallet_address: publicKey.toBase58(),
          wallet_type: 'solana',
          signature: Buffer.from(signature).toString('hex'),
          is_primary: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setSuccess('Lommeboken din er koblet til din Celora-konto!');
    } catch (err: any) {
      console.error('Feil ved kobling av lommebok:', err);
      setError(err.message || 'En feil oppstod ved kobling av lommeboken');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-card rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold mb-4">Koble Solana-lommebok</h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <p className="text-dark-text-secondary mb-2">
            Ved å koble din Solana-lommebok til din Celora-konto, kan du enkelt håndtere dine digitale eiendeler og få tilgang til alle funksjonene i Celora-plattformen.
          </p>
          
          {publicKey ? (
            <div className="bg-dark-surface p-3 rounded border border-dark-border mb-4">
              <div className="text-xs text-dark-text-secondary mb-1">Tilkoblet lommebok:</div>
              <div className="font-mono text-sm text-primary-400">
                {publicKey.toBase58()}
              </div>
            </div>
          ) : (
            <div className="bg-dark-surface p-3 rounded border border-dark-border mb-4">
              <div className="text-dark-text-secondary">
                Ingen Solana-lommebok tilkoblet. Koble til med knappen øverst til høyre.
              </div>
            </div>
          )}
          
          <button
            onClick={linkWallet}
            disabled={!publicKey || !user || loading}
            className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Kobler til...' : 'Koble til lommebok'}
          </button>
        </div>
      </div>
    </div>
  );
}
