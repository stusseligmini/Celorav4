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
        console.log('Sign in error:', error.message);
        console.log('Wallet email:', walletEmail);
        console.log('Hash preview:', hashHex.slice(0, 8) + '...');
        
        if (error.message.includes('Invalid login credentials')) {
          return { 
            user: null, 
            error: 'No wallet found with this seed phrase. Please check your words or create a new wallet.', 
            success: false 
          };
        }
        
        return { 
          user: null, 
          error: `Sign in failed: ${error.message}`, 
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

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

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
        // Handle specific Supabase errors - try backup API for captcha issues
        if (error.message.toLowerCase().includes('captcha') || 
            error.message.toLowerCase().includes('rate limit') || 
            error.message.toLowerCase().includes('too many')) {
          
          // Try backup API route that uses admin API
          try {
            const backupResponse = await fetch('/api/auth/create-wallet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                seedPhrase,
                fullName,
                publicEmail
              })
            });

            const backupResult = await backupResponse.json();
            
            if (backupResponse.ok && backupResult.success) {
              // Wait a moment for the user to be fully created, then sign in
              await new Promise(resolve => setTimeout(resolve, 2000));
              const signInResult = await this.signInWithSeedPhrase(seedPhrase);
              
              if (signInResult.success) {
                return signInResult;
              } else {
                // If sign in fails, return success anyway since account was created
                return {
                  user: backupResult.user,
                  error: null,
                  success: true
                };
              }
            } else {
              return { 
                user: null, 
                error: backupResult.error || 'Account creation failed. Please try again later.', 
                success: false 
              };
            }
          } catch (backupError) {
            return { 
              user: null, 
              error: 'Account creation is temporarily unavailable. Please try email signup instead or contact support.', 
              success: false 
            };
          }
        }
        
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
          return { 
            user: null, 
            error: 'This seed phrase is already in use. Try signing in instead or generate a new seed phrase.', 
            success: false 
          };
        }
        return { user: null, error: error.message, success: false };
      }

      // If successful, create user profile
      if (data.user) {
        const profileResult = await this.createUserProfile(data.user as User);
        if (profileResult.error) {
          console.warn('Profile creation failed:', profileResult.error);
        }
      }

      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      console.error('Wallet creation error:', err);
      return { 
        user: null, 
        error: 'Network error or service temporarily unavailable. Please check your internet connection and try again.', 
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