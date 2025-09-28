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
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          full_name: string | null
          date_of_birth: string | null
          mfa_enabled: boolean
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          date_of_birth?: string | null
          mfa_enabled?: boolean
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          date_of_birth?: string | null
          mfa_enabled?: boolean
        }
      }
      mfa_recovery_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          created_at: string
          used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          created_at?: string
          used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          created_at?: string
          used_at?: string | null
        }
      }
      mfa_verification_logs: {
        Row: {
          id: string
          user_id: string
          success: boolean
          created_at: string
          verification_method: 'totp' | 'recovery_code'
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id: string
          success: boolean
          created_at?: string
          verification_method: 'totp' | 'recovery_code'
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          success?: boolean
          created_at?: string
          verification_method?: 'totp' | 'recovery_code'
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      mfa_recovery_requests: {
        Row: {
          id: string
          case_number: string
          user_id: string | null
          email: string
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          created_at: string
          updated_at: string
          request_data: Json
          reviewer_id: string | null
          review_notes: string | null
        }
        Insert: {
          id?: string
          case_number: string
          user_id?: string | null
          email: string
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          created_at?: string
          updated_at?: string
          request_data?: Json
          reviewer_id?: string | null
          review_notes?: string | null
        }
        Update: {
          id?: string
          case_number?: string
          user_id?: string | null
          email?: string
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          created_at?: string
          updated_at?: string
          request_data?: Json
          reviewer_id?: string | null
          review_notes?: string | null
        }
      }
      security_events: {
        Row: {
          id: string
          user_id: string
          event: string
          details: Json
          created_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event: string
          details?: Json
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event?: string
          details?: Json
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_mfa_statistics: {
        Args: Record<string, never>
        Returns: {
          total_users: number
          mfa_enabled_users: number
          adoption_rate: number
        }
      }
      get_mfa_verification_stats: {
        Args: Record<string, never>
        Returns: {
          total_verifications: number
          successful_verifications: number
          failed_verifications: number
          success_rate: number
        }
      }
      get_mfa_daily_usage: {
        Args: {
          days_limit: number
        }
        Returns: {
          date: string
          total_verifications: number
          successful_verifications: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}