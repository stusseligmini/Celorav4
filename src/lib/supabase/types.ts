// ================================================================
// SUPABASE DATABASE TYPES
// Purpose: TypeScript definitions for database tables and operations
// Auto-generated from Supabase schema with manual enhancements
// ================================================================

/**
 * Database schema types generated from unified-schema-v2.sql
 * These types should match your actual database schema exactly.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          is_verified: boolean
          kyc_status: 'pending' | 'approved' | 'rejected'
          two_factor_enabled: boolean
          preferred_currency: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          kyc_status?: 'pending' | 'approved' | 'rejected'
          two_factor_enabled?: boolean
          preferred_currency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          kyc_status?: 'pending' | 'approved' | 'rejected'
          two_factor_enabled?: boolean
          preferred_currency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          wallet_name: string
          wallet_type: 'ethereum' | 'solana' | 'bitcoin' | 'fiat'
          public_key: string
          encrypted_private_key: string | null
          encrypted_mnemonic: string | null
          network: string
          currency: string
          balance: number
          usd_balance: number
          is_primary: boolean
          is_active: boolean
          derivation_path: string | null
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_name: string
          wallet_type: 'ethereum' | 'solana' | 'bitcoin' | 'fiat'
          public_key: string
          encrypted_private_key?: string | null
          encrypted_mnemonic?: string | null
          network: string
          currency?: string
          balance?: number
          usd_balance?: number
          is_primary?: boolean
          is_active?: boolean
          derivation_path?: string | null
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_name?: string
          wallet_type?: 'ethereum' | 'solana' | 'bitcoin' | 'fiat'
          public_key?: string
          encrypted_private_key?: string | null
          encrypted_mnemonic?: string | null
          network?: string
          currency?: string
          balance?: number
          usd_balance?: number
          is_primary?: boolean
          is_active?: boolean
          derivation_path?: string | null
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      virtual_cards: {
        Row: {
          id: string
          user_id: string
          masked_pan: string
          encrypted_payload: string | null
          card_type: 'virtual' | 'physical'
          balance: number
          currency: string
          spending_limit: number
          daily_limit: number
          monthly_limit: number
          status: 'active' | 'suspended' | 'closed' | 'pending'
          pin_hash: string | null
          pin_attempts: number
          pin_locked_until: string | null
          is_primary: boolean
          is_frozen: boolean
          freeze_reason: string | null
          last_used_at: string | null
          fraud_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          masked_pan?: string
          encrypted_payload?: string | null
          card_type?: 'virtual' | 'physical'
          balance?: number
          currency?: string
          spending_limit?: number
          daily_limit?: number
          monthly_limit?: number
          status?: 'active' | 'suspended' | 'closed' | 'pending'
          pin_hash?: string | null
          pin_attempts?: number
          pin_locked_until?: string | null
          is_primary?: boolean
          is_frozen?: boolean
          freeze_reason?: string | null
          last_used_at?: string | null
          fraud_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          masked_pan?: string
          encrypted_payload?: string | null
          card_type?: 'virtual' | 'physical'
          balance?: number
          currency?: string
          spending_limit?: number
          daily_limit?: number
          monthly_limit?: number
          status?: 'active' | 'suspended' | 'closed' | 'pending'
          pin_hash?: string | null
          pin_attempts?: number
          pin_locked_until?: string | null
          is_primary?: boolean
          is_frozen?: boolean
          freeze_reason?: string | null
          last_used_at?: string | null
          fraud_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          card_id: string | null
          wallet_id: string | null
          transaction_type: 'purchase' | 'transfer' | 'deposit' | 'withdrawal' | 'refund' | 'fee' | 'crypto_swap' | 'topup' | 'send' | 'receive'
          amount: number
          currency: string
          fee_amount: number
          exchange_rate: number | null
          status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing'
          description: string | null
          merchant_name: string | null
          merchant_category: string | null
          tx_hash: string | null
          block_number: number | null
          confirmations: number
          gas_used: number | null
          gas_price: number | null
          reference_id: string | null
          external_id: string | null
          related_transaction_id: string | null
          risk_score: number
          location_data: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          card_id?: string | null
          wallet_id?: string | null
          transaction_type: 'purchase' | 'transfer' | 'deposit' | 'withdrawal' | 'refund' | 'fee' | 'crypto_swap' | 'topup' | 'send' | 'receive'
          amount: number
          currency?: string
          fee_amount?: number
          exchange_rate?: number | null
          status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing'
          description?: string | null
          merchant_name?: string | null
          merchant_category?: string | null
          tx_hash?: string | null
          block_number?: number | null
          confirmations?: number
          gas_used?: number | null
          gas_price?: number | null
          reference_id?: string | null
          external_id?: string | null
          related_transaction_id?: string | null
          risk_score?: number
          location_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string | null
          wallet_id?: string | null
          transaction_type?: 'purchase' | 'transfer' | 'deposit' | 'withdrawal' | 'refund' | 'fee' | 'crypto_swap' | 'topup' | 'send' | 'receive'
          amount?: number
          currency?: string
          fee_amount?: number
          exchange_rate?: number | null
          status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing'
          description?: string | null
          merchant_name?: string | null
          merchant_category?: string | null
          tx_hash?: string | null
          block_number?: number | null
          confirmations?: number
          gas_used?: number | null
          gas_price?: number | null
          reference_id?: string | null
          external_id?: string | null
          related_transaction_id?: string | null
          risk_score?: number
          location_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          actor_user_id: string | null
          entity_type: string
          entity_id: string
          action: string
          before_data: Json | null
          after_data: Json | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          entity_type: string
          entity_id: string
          action: string
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_user_id?: string | null
          entity_type?: string
          entity_id?: string
          action?: string
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'transaction' | 'security' | 'system' | 'marketing' | 'crypto'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          read: boolean
          action_url: string | null
          metadata: Json
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'transaction' | 'security' | 'system' | 'marketing' | 'crypto'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          read?: boolean
          action_url?: string | null
          metadata?: Json
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'transaction' | 'security' | 'system' | 'marketing' | 'crypto'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          read?: boolean
          action_url?: string | null
          metadata?: Json
          expires_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          entity_type: string
          entity_id: string
          action: string
          before_data: Json | null
          after_data: Json | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          created_at: string
        }
      }
    }
    Functions: {
      verify_card_pin: {
        Args: {
          card_uuid: string
          pin_input: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type VirtualCard = Database['public']['Tables']['virtual_cards']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types for forms
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type WalletInsert = Database['public']['Tables']['wallets']['Insert']
export type VirtualCardInsert = Database['public']['Tables']['virtual_cards']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

// Update types for patches
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type WalletUpdate = Database['public']['Tables']['wallets']['Update']
export type VirtualCardUpdate = Database['public']['Tables']['virtual_cards']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type AuditLogUpdate = Database['public']['Tables']['audit_log']['Update']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']