import { createBrowserClient } from '@supabase/ssr';
import { seedPhraseToHash } from './seedPhrase';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  wallet_type?: 'email' | 'seed_phrase';
  public_email?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
  success: boolean;
}

class AuthService {
  private supabase;

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: error.message, success: false };
      }

      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { 
        user: null, 
        error: 'An unexpected error occurred', 
        success: false 
      };
    }
  }

  // Sign in with seed phrase
  async signInWithSeedPhrase(seedPhrase: string[]): Promise<AuthResponse> {
    try {
      // Validate seed phrase format
      if (seedPhrase.length !== 12 || seedPhrase.some(word => !word.trim())) {
        return { 
          user: null, 
          error: 'Please enter all 12 seed phrase words', 
          success: false 
        };
      }

      // Generate hash from seed phrase
      const hashHex = await seedPhraseToHash(seedPhrase);
      const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: walletEmail,
        password: hashHex
      });

      if (error) {
        return { 
          user: null, 
          error: 'Invalid seed phrase or wallet not found', 
          success: false 
        };
      }

      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { 
        user: null, 
        error: 'Failed to authenticate with seed phrase', 
        success: false 
      };
    }
  }

  // Sign up with email and password
  async signUpWithEmail(
    email: string, 
    password: string, 
    fullName: string
  ): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            wallet_type: 'email'
          }
        }
      });

      if (error) {
        return { user: null, error: error.message, success: false };
      }

      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { 
        user: null, 
        error: 'Failed to create account', 
        success: false 
      };
    }
  }

  // Create wallet with seed phrase
  async createWalletWithSeedPhrase(
    seedPhrase: string[],
    fullName: string,
    publicEmail?: string
  ): Promise<AuthResponse> {
    try {
      // Generate hash from seed phrase
      const hashHex = await seedPhraseToHash(seedPhrase);
      const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;

      const { data, error } = await this.supabase.auth.signUp({
        email: walletEmail,
        password: hashHex,
        options: {
          data: {
            full_name: fullName,
            wallet_type: 'seed_phrase',
            public_email: publicEmail || null
          }
        }
      });

      if (error) {
        return { user: null, error: error.message, success: false };
      }

      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { 
        user: null, 
        error: 'Failed to create wallet', 
        success: false 
      };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return user as User;
    } catch (err) {
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (err) {
      return { error: 'Failed to sign out' };
    }
  }

  // Listen for auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as User || null);
    });
  }

  // Update user profile
  async updateProfile(updates: {
    full_name?: string;
    public_email?: string;
  }): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        data: updates
      });

      return { error: error?.message || null };
    } catch (err) {
      return { error: 'Failed to update profile' };
    }
  }

  // Create user profile in database
  async createUserProfile(user: User): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            full_name: user.full_name,
            email: user.public_email || user.email,
            wallet_type: user.wallet_type || 'email',
            created_at: new Date().toISOString()
          }
        ]);

      return { error: error?.message || null };
    } catch (err) {
      return { error: 'Failed to create user profile' };
    }
  }

  // Reset password (for email accounts only)
  async resetPassword(email: string): Promise<{ error: string | null; success: boolean }> {
    try {
      // Check if this is a wallet email (seed phrase account)
      if (email.includes('@celora.wallet')) {
        return { 
          error: 'Seed phrase wallets cannot reset passwords. Please use your 12-word recovery phrase.', 
          success: false 
        };
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { error: error.message, success: false };
      }

      return { error: null, success: true };
    } catch (err) {
      return { error: 'Failed to send reset email', success: false };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;