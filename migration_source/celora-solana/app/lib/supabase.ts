// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Disse verdiene bør settes i environment variabler i produksjon
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database hjelpefunksjoner
export const getUserProfile = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', address)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Feil ved henting av brukerprofil:', error);
    return null;
  }
};

export const saveUserProfile = async (address: string, nickname: string, email?: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: address,
        nickname,
        email,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Feil ved lagring av brukerprofil:', error);
    return null;
  }
};

export const saveTransaction = async (
  senderAddress: string, 
  receiverAddress: string, 
  amount: number, 
  tokenSymbol: string,
  txHash: string
) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        sender_address: senderAddress,
        receiver_address: receiverAddress,
        amount,
        token_symbol: tokenSymbol,
        tx_hash: txHash,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Feil ved lagring av transaksjon:', error);
    return null;
  }
};

export const getUserTransactions = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Feil ved henting av transaksjoner:', error);
    return [];
  }
};