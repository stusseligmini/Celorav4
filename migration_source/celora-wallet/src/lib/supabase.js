import { createClient } from '@supabase/supabase-js';

// Supabase-klienten initialiseres med miljøvariabler fra .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Opprett Supabase-klienten
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

// Helper-funksjoner for vanlige database-operasjoner
export const supabaseAPI = {
  // Autentisering
  auth: {
    signUp: async (email, password) => {
      return await supabase.auth.signUp({
        email,
        password,
      });
    },
    signIn: async (email, password) => {
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    },
    signOut: async () => {
      return await supabase.auth.signOut();
    },
    getSession: async () => {
      return await supabase.auth.getSession();
    },
    getCurrentUser: async () => {
      return await supabase.auth.getUser();
    }
  },

  // Wallet-funksjoner
  wallets: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    getById: async (id) => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    create: async (walletData) => {
      const { data, error } = await supabase
        .from('wallets')
        .insert(walletData)
        .select()
        .single();
      
      return { data, error };
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('wallets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);
      
      return { error };
    }
  },

  // Transaksjons-funksjoner
  transactions: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    getById: async (id) => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    getByWallet: async (walletId) => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    create: async (transactionData) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      return { data, error };
    }
  },

  // Profil-funksjoner
  profiles: {
    get: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();
      
      return { data, error };
    },
    update: async (updates) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', supabase.auth.user()?.id)
        .select()
        .single();
      
      return { data, error };
    }
  }
};

export default supabase;
