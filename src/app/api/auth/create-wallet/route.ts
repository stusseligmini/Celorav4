import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { seedPhraseToHash } from '@/lib/seedPhrase';
import { getSupabaseConfig } from '@/lib/supabase-config';

const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Backup API: Starting wallet creation...');
    
    const { seedPhrase, fullName, publicEmail } = await request.json();

    if (!seedPhrase || !Array.isArray(seedPhrase) || seedPhrase.length !== 12) {
      console.error('❌ Invalid seed phrase format');
      return NextResponse.json(
        { error: 'Invalid seed phrase format' },
        { status: 400 }
      );
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      console.error('❌ Full name is required');
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Generate hash from seed phrase
    const hashHex = await seedPhraseToHash(seedPhrase);
    const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;

    console.log('📧 Generated wallet email:', walletEmail);
    console.log('👤 Full name:', fullName);
    console.log('📮 Public email:', publicEmail || 'none');

    // Check if user already exists first (prevent duplicates)
    console.log('🔍 Checking for existing user...');
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === walletEmail);
      if (existing) {
        console.log('⚠️ User already exists with this seed phrase');
        return NextResponse.json(
          { error: 'This seed phrase is already in use. Please try signing in instead.' },
          { status: 409 }
        );
      }
    } catch (checkError) {
      console.log('ℹ️ Could not check existing user (continuing with creation)...');
    }

    // Create user with admin API (bypasses captcha completely)
    console.log('🔐 Creating user with admin API...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: walletEmail,
      password: hashHex,
      user_metadata: {
        full_name: fullName,
        wallet_type: 'seed_phrase',
        public_email: publicEmail || null
      },
      email_confirm: true // Auto-confirm email
    });

    if (error) {
      console.error('❌ Admin create user error:', error);
      
      // Handle specific errors
      if (error.message.toLowerCase().includes('already registered') || 
          error.message.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'This seed phrase is already in use. Try signing in instead.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create wallet: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ User created successfully:', data.user?.id);

    // Create profile in database (using your existing table structure)
    if (data.user) {
      console.log('👤 Creating user profile...');
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')  // Din eksisterende tabell
          .insert([
            {
              id: data.user.id,
              email: publicEmail || walletEmail,
              full_name: fullName,
              is_verified: true,
              kyc_status: 'verified',  // Seed phrase users are pre-verified
              created_at: new Date().toISOString()
            }
          ]);

        if (profileError) {
          console.warn('⚠️ Profile creation failed (may already exist):', profileError.message);
        } else {
          console.log('✅ Profile created successfully');
        }
      } catch (profileError) {
        console.warn('⚠️ Profile creation error:', profileError);
      }
    }

    console.log('🎉 Wallet creation completed successfully');
    return NextResponse.json(
      { 
        success: true, 
        message: 'Wallet created successfully via admin API',
        user: {
          id: data.user.id,
          email: walletEmail,
          full_name: fullName,
          wallet_type: 'seed_phrase'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 Wallet creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during wallet creation' },
      { status: 500 }
    );
  }
}
