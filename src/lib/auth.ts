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

  // Sign in with email and password - ENHANCED WITH CAPTCHA HANDLING
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Starting email sign in...');
      
      // Try admin login first (completely bypasses rate limits)
      console.log('🚀 Attempting admin login (rate-limit free)...');
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const body = await res.json();
        console.log('📡 Admin login response status:', res.status);
        
        if (res.ok && body?.session?.access_token) {
          console.log('✅ Got admin session, adopting on client...');
          const { error: setErr } = await this.supabase.auth.setSession({
            access_token: body.session.access_token,
            refresh_token: body.session.refresh_token
          });
          if (!setErr) {
            const { data: { user } } = await this.supabase.auth.getUser();
            console.log('✅ Admin login successful');
            return { user: user as User, error: null, success: true };
          } else {
            console.log('⚠️ Failed to set session on client:', setErr);
          }
        } else if (!res.ok) {
          console.log('❌ Admin login failed:', body.error);
          return { 
            user: null, 
            error: body.error || 'Invalid email or password. If you don\'t have an account yet, click "CREATE WALLET" below.', 
            success: false 
          };
        }
      } catch (adminErr) {
        console.log('🔥 Admin login error, falling back to server-login:', adminErr);
      }

      // Fallback to server-side login
      console.log('🔄 Falling back to server-side login...');
      try {
        const res = await fetch('/api/auth/server-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          const body = await res.json();
          if (body?.session?.access_token) {
            const { error: setErr } = await this.supabase.auth.setSession({
              access_token: body.session.access_token,
              refresh_token: body.session.refresh_token
            });
            if (!setErr) {
              const { data: { user } } = await this.supabase.auth.getUser();
              console.log('✅ Server-first login successful');
              return { user: user as User, error: null, success: true };
            }
          }
        }
      } catch (serverFirstErr) {
        console.log('ℹ️ Server-first login attempt failed, falling back to client:', serverFirstErr);
      }

      // 2) Fallback to client sign-in
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.log('❌ Email sign in error (client):', error.message);
        
        // Handle rate limit/captcha errors more gracefully
        if (error.message.toLowerCase().includes('captcha') || 
            error.message.toLowerCase().includes('rate limit') || 
            error.message.toLowerCase().includes('too many')) {
          console.log('🔄 Rate limit detected, attempting server-side login...');
          // Try server-side login to mitigate rate limit
          try {
            const res = await fetch('/api/auth/server-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            if (res.ok) {
              const body = await res.json();
              if (body?.session?.access_token) {
                // Adopt the session on the client
                const { error: setErr } = await this.supabase.auth.setSession({
                  access_token: body.session.access_token,
                  refresh_token: body.session.refresh_token
                });
                if (!setErr) {
                  const { data: { user } } = await this.supabase.auth.getUser();
                  return { user: user as User, error: null, success: true };
                }
              }
            }
          } catch (serverErr) {
            console.log('⚠️ Server-side login fallback failed:', serverErr);
          }
          return { 
            user: null, 
            error: 'Authentication rate limit. Please try creating a new account instead, or wait 60 seconds and try again.', 
            success: false 
          };
        }
        
        if (error.message.includes('Invalid login credentials')) {
          return { 
            user: null, 
            error: 'Email or password is incorrect. If you don\'t have an account yet, click "CREATE WALLET" below.', 
            success: false 
          };
        }

        return { user: null, error: error.message, success: false };
      }

      console.log('✅ Email sign in successful');
      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      console.error('💥 Email sign in error:', err);
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
      console.log('🔐 Starting seed phrase sign in...');
      
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

      console.log('📧 Attempting sign in with wallet email:', walletEmail);
      console.log('🔐 Hash preview:', hashHex.slice(0, 8) + '...');

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: walletEmail,
        password: hashHex
      });

      if (error) {
        console.log('❌ Sign in error:', error.message);
        
        // Handle captcha errors during sign-in by using a different approach
          if (error.message.toLowerCase().includes('captcha') || 
              error.message.toLowerCase().includes('rate limit') || 
              error.message.toLowerCase().includes('too many')) {
            console.log('🔄 Captcha detected during sign-in, trying server-side login...');
            // 1) Try server-side login directly with wallet email/hash
            try {
              const res = await fetch('/api/auth/server-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: walletEmail, password: hashHex })
              });
              if (res.ok) {
                const body = await res.json();
                if (body?.session?.access_token) {
                  const { error: setErr } = await this.supabase.auth.setSession({
                    access_token: body.session.access_token,
                    refresh_token: body.session.refresh_token
                  });
                  if (!setErr) {
                    const { data: { user } } = await this.supabase.auth.getUser();
                    return { user: user as User, error: null, success: true };
                  }
                }
              }
            } catch (serverErr) {
              console.log('ℹ️ Server-side seed phrase login failed, falling back:', serverErr);
            }

            console.log('🔁 Falling back to verify-wallet flow...');
            // 2) Fallback: use admin API to verify existence and provide action link
            try {
              const verifyResponse = await fetch('/api/auth/verify-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seedPhrase, walletEmail, hashHex })
              });

              const verifyResult = await verifyResponse.json();
            
              if (verifyResponse.ok && verifyResult.success) {
                console.log('✅ Alternative verification successful');
                return {
                  user: verifyResult.user,
                  error: null,
                  success: true
                };
              } else {
                console.log('❌ Alternative verification failed:', verifyResult.error || 'Unknown error');
                return {
                  user: null,
                  error: verifyResult.error || 'Failed to authenticate with seed phrase',
                  success: false
                };
              }
            } catch (verifyErr) {
              console.log('❌ Alternative verification error:', verifyErr);
              return { user: null, error: 'Failed to authenticate with seed phrase', success: false };
            }
        }
        
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

      console.log('✅ Sign in successful');
      return { 
        user: data.user as User, 
        error: null, 
        success: true 
      };
    } catch (err) {
      console.error('💥 Sign in error:', err);
      return { 
        user: null, 
        error: 'Failed to authenticate with seed phrase', 
        success: false 
      };
    }
  }

  // Sign up with email and password - CAPTCHA-FREE VERSION
  async signUpWithEmail(
    email: string, 
    password: string, 
    fullName: string
  ): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting captcha-free email registration...');
      
      // BYPASS standard signup completely and use backup API directly
      // This avoids captcha issues entirely for email accounts too
      console.log('📧 Email registration details:', { email, fullName });
      
      try {
        const backupResponse = await fetch('/api/auth/create-email-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            fullName
          })
        });

        const backupResult = await backupResponse.json();
        console.log('📋 Email backup API response:', backupResult);
        
        if (backupResponse.ok && backupResult.success) {
          console.log('✅ Email account created via backup API successfully');
          
          // Wait a moment for the user to be fully created, then sign in
          console.log('⏳ Waiting before attempting sign in...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const signInResult = await this.signInWithEmail(email, password);
          console.log('🔑 Email sign in result:', signInResult);
          
          if (signInResult.success) {
            return signInResult;
          } else {
            // Account was created but sign-in failed - still success
            return {
              user: null,
              error: null,
              success: true // Mark as success since account was created
            };
          }
        } else {
          console.error('❌ Email backup API failed:', backupResult);
          
          // Handle specific errors
          if (backupResult.error?.includes('already registered') || 
              backupResult.error?.includes('already exists')) {
            return { 
              user: null, 
              error: 'An account with this email already exists. Please try signing in instead.', 
              success: false 
            };
          }
          
          return { 
            user: null, 
            error: backupResult.error || 'Account creation failed. Please try again.', 
            success: false 
          };
        }
      } catch (backupError) {
        console.error('❌ Email backup API error:', backupError);
        return { 
          user: null, 
          error: 'Network error during account creation. Please check your connection.', 
          success: false 
        };
      }
    } catch (err) {
      console.error('💥 Email account creation error:', err);
      return { 
        user: null, 
        error: 'Failed to create account', 
        success: false 
      };
    }
  }

  // Create wallet with seed phrase - COMPLETELY BYPASS CAPTCHA
  async createWalletWithSeedPhrase(
    seedPhrase: string[],
    fullName: string,
    publicEmail?: string
  ): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting CAPTCHA-FREE wallet creation...');
      
      // Generate hash from seed phrase
      const hashHex = await seedPhraseToHash(seedPhrase);
      const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;

      console.log('📧 Generated wallet email:', walletEmail);
      console.log('� Full name:', fullName);

      // ALWAYS use backup API - never use standard signup that can trigger captcha
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
      console.log('📋 Backup API response:', backupResult);
      
      if (backupResponse.ok && backupResult.success) {
        console.log('✅ Wallet created successfully via Admin API');
        
        // Wait and then try to sign in
        console.log('⏳ Waiting 2 seconds before sign in...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try direct sign in (no captcha issues here since account exists)
        const signInResult = await this.signInWithSeedPhrase(seedPhrase);
        
        if (signInResult.success) {
          console.log('🎉 Auto sign-in successful!');
          return signInResult;
        } else {
          console.log('⚠️ Auto sign-in failed but account exists');
          // Account was created successfully, just return success with instruction
          return {
            user: null,
            error: null,
            success: true // Mark as success since wallet was created
          };
        }
      } else {
        console.error('❌ Backup API failed:', backupResult);
        
        // Handle specific errors
        if (backupResult.error?.includes('already in use') || backupResult.error?.includes('already exists')) {
          return { 
            user: null, 
            error: 'This seed phrase is already in use. Try signing in instead.', 
            success: false 
          };
        }
        
        return { 
          user: null, 
          error: backupResult.error || 'Account creation failed. Please try again.', 
          success: false 
        };
      }
    } catch (err) {
      console.error('💥 Wallet creation error:', err);
      return { 
        user: null, 
        error: 'Network error during account creation. Please check your connection.', 
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
        .from('user_profiles')  // Din eksisterende tabell
        .insert([
          {
            id: user.id,
            email: user.public_email || user.email,
            full_name: user.full_name,
            is_verified: true,
            kyc_status: user.wallet_type === 'seed_phrase' ? 'verified' : 'pending',
            created_at: new Date().toISOString()
          }
        ]);

      return { error: error?.message || null };
    } catch (err) {
      return { error: 'Failed to create user profile' };
    }
  }

  // Set up seed phrase for existing user (AFTER email registration)
  async setupSeedPhrase(seedPhrase: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Setting up seed phrase for existing user...');
      
      const { data: { user: currentUser } } = await this.supabase.auth.getUser();
      
      if (!currentUser) {
        return { 
          user: null, 
          error: 'You must be logged in to set up a seed phrase', 
          success: false 
        };
      }

      // Hash the seed phrase for secure storage
      const seedWords = seedPhrase.split(' ');
      const seedHash = await seedPhraseToHash(seedWords);
      
      // Update user profile with seed phrase backup
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          seed_phrase_hash: seedHash,
          has_seed_phrase: true,
          seed_phrase_created_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (updateError) {
        console.error('❌ Failed to save seed phrase:', updateError);
        return { 
          user: null, 
          error: 'Failed to save seed phrase backup', 
          success: false 
        };
      }

      console.log('✅ Seed phrase backup created successfully');
      return { 
        user: currentUser as User, 
        error: null, 
        success: true 
      };
      
    } catch (err) {
      console.error('❌ Setup seed phrase error:', err);
      return { 
        user: null, 
        error: 'Failed to set up seed phrase backup', 
        success: false 
      };
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