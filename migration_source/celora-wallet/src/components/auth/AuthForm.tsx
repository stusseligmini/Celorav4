'use client';

import { useState, FormEvent } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  
  const { signIn, signUp } = useSupabase();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess('');
    
    try {
      if (isSignUp) {
        // Registrer ny bruker
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('Registrering vellykket! Sjekk e-posten din for bekreftelseslenke.');
      } else {
        // Logg inn eksisterende bruker
        const { error } = await signIn(email, password);
        if (error) throw error;
        setSuccess('Innlogging vellykket!');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'En feil oppstod ved autentisering');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-dark-card rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? 'Opprett ny konto' : 'Logg inn på Celora'}
      </h2>
      
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            E-post
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded bg-dark-surface border border-dark-border focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Passord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 rounded bg-dark-surface border border-dark-border focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
        >
          {loading ? 'Vennligst vent...' : isSignUp ? 'Registrer' : 'Logg inn'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-primary hover:underline focus:outline-none"
        >
          {isSignUp
            ? 'Har du allerede en konto? Logg inn'
            : 'Ny bruker? Opprett konto'}
        </button>
      </div>
    </div>
  );
}
