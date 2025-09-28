import { createBrowserClient } from '@supabase/ssr';
import { seedPhraseToHash } from './seedPhrase';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  wallet_type?: 'email' | 'seed_phrase';
  public_email?: string;
  created_at: string;
  mfa_enabled?: boolean;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
  success: boolean;
  requiresMFA?: boolean;
  tempToken?: string; // Temporary token for MFA verification flow
}

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
  error: string | null;
  success: boolean;
}

export interface MFAEnableResponse {
  enabled: boolean;
  error: string | null;
  recoveryCodes: string[];
}

export interface MFADisableResponse {
  disabled: boolean;
  error: string | null;
}

export interface MFAVerifyResponse {
  verified: boolean;
  error: string | null;
  user?: User;
}

class AuthService {
  supabase;

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Sign in with email and password - ENHANCED WITH CAPTCHA HANDLING & MFA
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
            
            // Check if MFA is enabled for this user
            if (user) {
              const { data: profileData, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('mfa_enabled')
                .eq('id', user.id)
                .single();
                
              if (!profileError && profileData?.mfa_enabled) {
                console.log('🔒 MFA is enabled for this user, requiring verification...');
                // Generate temporary token for MFA verification
                const tempToken = await this.generateTemporaryToken(user.id);
                
                return {
                  user: null,
                  error: null,
                  success: true,
                  requiresMFA: true,
                  tempToken
                };
              }
            }
            
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
              
              // Check if MFA is enabled for this user
              if (user) {
                const { data: profileData, error: profileError } = await this.supabase
                  .from('user_profiles')
                  .select('mfa_enabled')
                  .eq('id', user.id)
                  .single();
                  
                if (!profileError && profileData?.mfa_enabled) {
                  console.log('🔒 MFA is enabled for this user, requiring verification...');
                  // Generate temporary token for MFA verification
                  const tempToken = await this.generateTemporaryToken(user.id);
                  
                  return {
                    user: null,
                    error: null,
                    success: true,
                    requiresMFA: true,
                    tempToken
                  };
                }
              }
              
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
                  
                  // Check if MFA is enabled for this user
                  if (user) {
                    const { data: profileData, error: profileError } = await this.supabase
                      .from('user_profiles')
                      .select('mfa_enabled')
                      .eq('id', user.id)
                      .single();
                      
                    if (!profileError && profileData?.mfa_enabled) {
                      console.log('🔒 MFA is enabled for this user, requiring verification...');
                      // Generate temporary token for MFA verification
                      const tempToken = await this.generateTemporaryToken(user.id);
                      
                      return {
                        user: null,
                        error: null,
                        success: true,
                        requiresMFA: true,
                        tempToken
                      };
                    }
                  }
                  
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

      // Check if MFA is enabled for this user
      if (data.user) {
        const { data: profileData, error: profileError } = await this.supabase
          .from('user_profiles')
          .select('mfa_enabled')
          .eq('id', data.user.id)
          .single();
          
        if (!profileError && profileData?.mfa_enabled) {
          console.log('🔒 MFA is enabled for this user, requiring verification...');
          // Generate temporary token for MFA verification
          const tempToken = await this.generateTemporaryToken(data.user.id);
          
          return {
            user: null,
            error: null,
            success: true,
            requiresMFA: true,
            tempToken
          };
        }
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
  
  // Generate a temporary token for MFA verification
  private async generateTemporaryToken(userId: string): Promise<string> {
    // In a real implementation, this should create a secure temporary token
    // stored in the database with an expiration time
    // For this implementation, we'll create a signed token with userId and timestamp
    const timestamp = new Date().getTime();
    const token = `${userId}_${timestamp}_${Math.random().toString(36).substring(2, 15)}`;
    
    // In production, you'd store this token in a database table with expiration
    return token;
  }

  // Validate a temporary MFA token
  private async validateTemporaryToken(token: string, userId: string): Promise<boolean> {
    // In a real implementation, this would check the database for the token
    // and validate it's not expired and belongs to this user
    
    // For this implementation, we'll do a basic check
    if (!token) return false;
    
    const parts = token.split('_');
    if (parts.length !== 3) return false;
    
    const tokenUserId = parts[0];
    const timestamp = parseInt(parts[1]);
    
    // Check if token belongs to this user
    if (tokenUserId !== userId) return false;
    
    // Check if token is expired (10 minutes)
    const now = new Date().getTime();
    if (now - timestamp > 10 * 60 * 1000) return false;
    
    return true;
  }

  // Sign in with seed phrase
  async signInWithSeedPhrase(seedPhrase: string[]): Promise<AuthResponse> {
    try {
      console.log('🔐 Starting seed phrase sign in...');
      
      // Validate seed phrase format
      if (!Array.isArray(seedPhrase) || seedPhrase.length !== 12 || seedPhrase.some(word => !word || !word.trim())) {
        return { 
          user: null, 
          error: 'Please enter all 12 seed phrase words', 
          success: false 
        };
      }

      // Generate hash from seed phrase
      const hashHex = await seedPhraseToHash(seedPhrase);
      const walletEmail = `${hashHex.slice(0, 16)}@celora.net`;

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
                    
                    // Check if MFA is enabled for this user
                    if (user) {
                      const { data: profileData, error: profileError } = await this.supabase
                        .from('user_profiles')
                        .select('mfa_enabled')
                        .eq('id', user.id)
                        .single();
                        
                      if (!profileError && profileData?.mfa_enabled) {
                        console.log('🔒 MFA is enabled for this user, requiring verification...');
                        // Generate temporary token for MFA verification
                        const tempToken = await this.generateTemporaryToken(user.id);
                        
                        return {
                          user: null,
                          error: null,
                          success: true,
                          requiresMFA: true,
                          tempToken
                        };
                      }
                    }
                    
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
                
                // If we have a user, check for MFA
                if (verifyResult.user) {
                  const { data: profileData, error: profileError } = await this.supabase
                    .from('user_profiles')
                    .select('mfa_enabled')
                    .eq('id', verifyResult.user.id)
                    .single();
                    
                  if (!profileError && profileData?.mfa_enabled) {
                    console.log('🔒 MFA is enabled for this user, requiring verification...');
                    // Generate temporary token for MFA verification
                    const tempToken = await this.generateTemporaryToken(verifyResult.user.id);
                    
                    return {
                      user: null,
                      error: null,
                      success: true,
                      requiresMFA: true,
                      tempToken
                    };
                  }
                }
                
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

      // Check if MFA is enabled for this user
      if (data.user) {
        const { data: profileData, error: profileError } = await this.supabase
          .from('user_profiles')
          .select('mfa_enabled')
          .eq('id', data.user.id)
          .single();
          
        if (!profileError && profileData?.mfa_enabled) {
          console.log('🔒 MFA is enabled for this user, requiring verification...');
          // Generate temporary token for MFA verification
          const tempToken = await this.generateTemporaryToken(data.user.id);
          
          return {
            user: null,
            error: null,
            success: true,
            requiresMFA: true,
            tempToken
          };
        }
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
      const walletEmail = `${hashHex.slice(0, 16)}@celora.net`;

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

  // Set up MFA for a user
  async setupMFA(): Promise<MFASetupResponse> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          secret: '',
          qrCodeUrl: '',
          recoveryCodes: [],
          error: 'You must be logged in to set up MFA',
          success: false
        };
      }

      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `Celora:${user.email || user.id}`
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

      // Generate recovery codes using the server function
      const { data: recoveryCodes, error: recoveryError } = await this.supabase.rpc(
        'generate_recovery_codes'
      );

      if (recoveryError) {
        console.error('Error generating recovery codes:', recoveryError);
        return {
          secret: '',
          qrCodeUrl: '',
          recoveryCodes: [],
          error: 'Failed to generate recovery codes',
          success: false
        };
      }

      return {
        secret: secret.base32,
        qrCodeUrl,
        recoveryCodes: recoveryCodes || [],
        error: null,
        success: true
      };
    } catch (err) {
      console.error('Error setting up MFA:', err);
      return {
        secret: '',
        qrCodeUrl: '',
        recoveryCodes: [],
        error: 'An unexpected error occurred',
        success: false
      };
    }
  }

  // Enable MFA for a user after verification
  async enableMFA(secret: string, token: string, recoveryCodes: string[]): Promise<{ success: boolean, error: string | null }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'You must be logged in to enable MFA'
        };
      }

      // Verify token first
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.replace(/\s+/g, '')
      });

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Update user profile with MFA settings
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          mfa_enabled: true,
          mfa_secret: secret,
          mfa_recovery_codes: recoveryCodes,
          mfa_last_verified: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error enabling MFA:', updateError);
        return {
          success: false,
          error: 'Failed to enable MFA'
        };
      }

      // Record the current device as verified
      await this.recordVerifiedDevice(user.id);

      return {
        success: true,
        error: null
      };
    } catch (err) {
      console.error('Error enabling MFA:', err);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  // Record the current device as a verified MFA device
  private async recordVerifiedDevice(userId: string) {
    try {
      // Get current device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        lastVerified: new Date().toISOString(),
        deviceId: this.getDeviceId()
      };

      // Get current verified devices
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mfa_verified_devices')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting verified devices:', error);
        return;
      }

      // Add current device to the list
      let verifiedDevices = data.mfa_verified_devices || [];
      
      // Check if device already exists
      const existingIndex = verifiedDevices.findIndex((d: any) => d.deviceId === deviceInfo.deviceId);
      if (existingIndex >= 0) {
        // Update existing device
        verifiedDevices[existingIndex] = deviceInfo;
      } else {
        // Add new device
        verifiedDevices.push(deviceInfo);
      }

      // Update the devices list
      await this.supabase
        .from('user_profiles')
        .update({
          mfa_verified_devices: verifiedDevices
        })
        .eq('id', userId);
    } catch (err) {
      console.error('Error recording verified device:', err);
    }
  }

  // Get a unique device ID (simplified)
  private getDeviceId(): string {
    // In production, you should use a more sophisticated device fingerprinting
    // This is a simplified example
    let id = localStorage.getItem('celora_device_id');
    if (!id) {
      id = `device_${Math.random().toString(36).substring(2, 15)}_${new Date().getTime()}`;
      localStorage.setItem('celora_device_id', id);
    }
    return id;
  }

  // Verify MFA token during login
  async verifyMFA(tempToken: string, token: string): Promise<MFAVerifyResponse> {
    try {
      // Extract user ID from the temporary token
      const userId = tempToken.split('_')[0];
      
      // Validate the temporary token
      const isValidToken = await this.validateTemporaryToken(tempToken, userId);
      if (!isValidToken) {
        return {
          verified: false,
          error: 'Invalid or expired session. Please log in again.'
        };
      }
      
      // Get the user's MFA secret
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mfa_secret, id')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        console.error('Error getting MFA secret:', error);
        return {
          verified: false,
          error: 'Failed to verify MFA'
        };
      }
      
      // Verify the provided token against the secret
      const isValid = speakeasy.totp.verify({
        secret: data.mfa_secret,
        encoding: 'base32',
        token: token.replace(/\s+/g, '')
      });
      
      if (!isValid) {
        // Log failed attempt
        await this.supabase
          .from('mfa_verification_log')
          .insert([
            {
              user_id: userId,
              success: false
            }
          ]);
          
        return {
          verified: false,
          error: 'Invalid verification code'
        };
      }
      
      // Log successful attempt
      await this.supabase
        .from('mfa_verification_log')
        .insert([
          {
            user_id: userId,
            success: true
          }
        ]);
      
      // Update last verified timestamp
      await this.supabase
        .from('user_profiles')
        .update({
          mfa_last_verified: new Date().toISOString()
        })
        .eq('id', userId);
      
      // Record the current device as verified
      await this.recordVerifiedDevice(userId);
      
      // Get the user to complete the sign-in
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          verified: false,
          error: 'Failed to get user data'
        };
      }
      
      return {
        verified: true,
        error: null,
        user: user as User
      };
    } catch (err) {
      console.error('Error verifying MFA:', err);
      return {
        verified: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  // Verify recovery code
  async verifyRecoveryCode(tempToken: string, recoveryCode: string): Promise<MFAVerifyResponse> {
    try {
      // Extract user ID from the temporary token
      const userId = tempToken.split('_')[0];
      
      // Validate the temporary token
      const isValidToken = await this.validateTemporaryToken(tempToken, userId);
      if (!isValidToken) {
        return {
          verified: false,
          error: 'Invalid or expired session. Please log in again.'
        };
      }
      
      // Verify the recovery code using the database function
      const { data: verifyResult, error: verifyError } = await this.supabase.rpc(
        'verify_recovery_code',
        {
          p_user_id: userId,
          p_code: recoveryCode
        }
      );
      
      if (verifyError) {
        console.error('Error verifying recovery code:', verifyError);
        return {
          verified: false,
          error: 'Failed to verify recovery code'
        };
      }
      
      if (!verifyResult) {
        return {
          verified: false,
          error: 'Invalid recovery code'
        };
      }
      
      // Record the current device as verified
      await this.recordVerifiedDevice(userId);
      
      // Get the user to complete the sign-in
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          verified: false,
          error: 'Failed to get user data'
        };
      }
      
      return {
        verified: true,
        error: null,
        user: user as User
      };
    } catch (err) {
      console.error('Error verifying recovery code:', err);
      return {
        verified: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  // Disable MFA for a user
  async disableMFA(token: string): Promise<{ success: boolean, error: string | null }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'You must be logged in to disable MFA'
        };
      }

      // Get the user's MFA secret
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mfa_secret, mfa_enabled')
        .eq('id', user.id)
        .single();
      
      if (error || !data) {
        return {
          success: false,
          error: 'Failed to get MFA settings'
        };
      }
      
      // If MFA is not enabled, nothing to do
      if (!data.mfa_enabled) {
        return {
          success: true,
          error: null
        };
      }
      
      // Verify the token first
      const isValid = speakeasy.totp.verify({
        secret: data.mfa_secret,
        encoding: 'base32',
        token: token.replace(/\s+/g, '')
      });
      
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Update user profile to disable MFA
      const { error: updateError } = await this.supabase
        .from('user_profiles')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_recovery_codes: null,
          mfa_verified_devices: []
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error disabling MFA:', updateError);
        return {
          success: false,
          error: 'Failed to disable MFA'
        };
      }

      return {
        success: true,
        error: null
      };
    } catch (err) {
      console.error('Error disabling MFA:', err);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  // Check if current user has MFA enabled
  async isMFAEnabled(): Promise<boolean> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return false;
      }

      // Check user profile for MFA setting
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mfa_enabled')
        .eq('id', user.id)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      return data.mfa_enabled || false;
    } catch (err) {
      console.error('Error checking MFA status:', err);
      return false;
    }
  }

  // Get remaining recovery codes
  async getRemainingRecoveryCodes(): Promise<string[]> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        return [];
      }

      // Get recovery codes
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mfa_recovery_codes')
        .eq('id', user.id)
        .single();
      
      if (error || !data) {
        return [];
      }
      
      return data.mfa_recovery_codes || [];
    } catch (err) {
      console.error('Error getting recovery codes:', err);
      return [];
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Get MFA status
      if (user) {
        const { data } = await this.supabase
          .from('user_profiles')
          .select('mfa_enabled')
          .eq('id', user.id)
          .single();
          
        if (data) {
          (user as User).mfa_enabled = data.mfa_enabled;
        }
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
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Get MFA status
        const { data } = await this.supabase
          .from('user_profiles')
          .select('mfa_enabled')
          .eq('id', session.user.id)
          .single();
          
        if (data) {
          (session.user as User).mfa_enabled = data.mfa_enabled;
        }
      }
      
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
      if (email.includes('@celora.net')) {
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

// Eksportere MFA standalone funksjoner for direkte bruk

/**
 * Setup MFA for the current user
 * @returns MFA setup information including secret and QR code URL
 */
export async function setupMFA(): Promise<MFASetupResponse> {
  return authService.setupMFA();
}

/**
 * Verify MFA token during login or setup
 * @param userId User ID or temp token
 * @param token Verification code
 * @param isRecoveryCode Whether the token is a recovery code
 * @returns Verification result
 */
export async function verifyMFA(userId: string, token: string, isRecoveryCode: boolean = false): Promise<MFAVerifyResponse> {
  if (isRecoveryCode) {
    const result = await authService.verifyRecoveryCode(userId, token);
    return {
      verified: result.verified,
      error: result.error,
      user: result.user
    };
  } else {
    const result = await authService.verifyMFA(userId, token);
    return {
      verified: result.verified,
      error: result.error,
      user: result.user
    };
  }
}

/**
 * Enable MFA for the current user
 * @param secret The MFA secret
 * @param token Verification token to confirm setup
 * @returns Result of the operation
 */
export async function enableMFA(userId: string, token: string): Promise<MFAEnableResponse> {
  // Get recoveryCodes first
  const { data: recoveryCodes, error: recoveryError } = await authService.supabase.rpc(
    'generate_recovery_codes'
  );

  if (recoveryError) {
    return {
      enabled: false,
      error: 'Failed to generate recovery codes',
      recoveryCodes: []
    };
  }
  
  // Get MFA secret
  const { data, error } = await authService.supabase
    .from('user_profiles')
    .select('mfa_secret')
    .eq('id', userId)
    .single();
    
  if (error || !data?.mfa_secret) {
    return {
      enabled: false,
      error: 'MFA not set up properly',
      recoveryCodes: []
    };
  }
  
  const result = await authService.enableMFA(data.mfa_secret, token, recoveryCodes || []);
  
  return {
    enabled: result.success,
    error: result.error,
    recoveryCodes: recoveryCodes || []
  };
}

/**
 * Disable MFA for the current user
 * @param userId The user ID
 * @param token Verification token to confirm
 * @returns Result of the operation
 */
export async function disableMFA(userId: string, token: string): Promise<MFADisableResponse> {
  const result = await authService.disableMFA(token);
  
  return {
    disabled: result.success,
    error: result.error
  };
}

/**
 * Check if the current user has MFA enabled
 * @returns True if MFA is enabled, false otherwise
 */
export async function isMFAEnabled(): Promise<boolean> {
  return await authService.isMFAEnabled();
}

/**
 * Get the remaining recovery codes for the current user
 * @returns Array of remaining recovery codes
 */
export async function getRemainingRecoveryCodes(): Promise<string[]> {
  return await authService.getRemainingRecoveryCodes();
}

// Export singleton instance
export const authService = new AuthService();
export default authService;