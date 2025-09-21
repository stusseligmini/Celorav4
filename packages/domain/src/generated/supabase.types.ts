// Generated manually from supabase-schema.sql (placeholder until CLI generation)
// Replace by running: supabase gen types typescript --project-id <project-id> --schema public > supabase.types.ts

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Row'],'id'>>;
      };
      virtual_cards: {
        Row: { id: string; user_id: string; masked_pan: string; encrypted_payload: string; balance: number; currency: string; status: 'active'|'suspended'|'closed'; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; masked_pan?: string; encrypted_payload?: string; balance?: number; currency?: string; status?: 'active'|'suspended'|'closed'; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Database['public']['Tables']['virtual_cards']['Row'],'id'|'user_id'>>;
      };
      transactions: {
        Row: { id: string; card_id: string; user_id: string; amount: number; currency: string; transaction_type: 'purchase'|'refund'|'fee'|'topup'|'withdrawal'; merchant_name: string | null; merchant_category: string | null; status: 'pending'|'completed'|'failed'|'cancelled'; external_transaction_id: string | null; metadata: any; created_at: string };
        Insert: { id?: string; card_id: string; user_id: string; amount: number; currency?: string; transaction_type: 'purchase'|'refund'|'fee'|'topup'|'withdrawal'; merchant_name?: string | null; merchant_category?: string | null; status?: 'pending'|'completed'|'failed'|'cancelled'; external_transaction_id?: string | null; metadata?: any; created_at?: string };
        Update: Partial<Omit<Database['public']['Tables']['transactions']['Row'],'id'|'user_id'|'card_id'>>;
      };
      wallets: {
        Row: { id: string; user_id: string; address: string; blockchain: 'solana'|'ethereum'; balance: number; created_at: string };
        Insert: { id?: string; user_id: string; address: string; blockchain: 'solana'|'ethereum'; balance?: number; created_at?: string };
        Update: Partial<Omit<Database['public']['Tables']['wallets']['Row'],'id'|'user_id'>>;
      };
    };
  };
}

export type VCard = Database['public']['Tables']['virtual_cards']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
