import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { seedPhraseToHash } from '@/lib/seedPhrase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { seedPhrase, fullName, publicEmail } = await request.json();

    if (!seedPhrase || !Array.isArray(seedPhrase) || seedPhrase.length !== 12) {
      return NextResponse.json(
        { error: 'Invalid seed phrase format' },
        { status: 400 }
      );
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Generate hash from seed phrase
    const hashHex = await seedPhraseToHash(seedPhrase);
    const walletEmail = `${hashHex.slice(0, 16)}@celora.wallet`;

    // Check if wallet already exists (using profile table)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', walletEmail)
      .single();
    
    if (existingProfile) {
      return NextResponse.json(
        { error: 'This seed phrase is already registered. Try signing in instead.' },
        { status: 409 }
      );
    }

    // Create user with admin API (bypasses captcha)
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
      console.error('Admin create user error:', error);
      return NextResponse.json(
        { error: 'Failed to create wallet account' },
        { status: 500 }
      );
    }

    // Create profile in database
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            full_name: fullName,
            email: publicEmail || walletEmail,
            wallet_type: 'seed_phrase',
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.warn('Profile creation failed:', profileError);
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Wallet created successfully',
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
    console.error('Wallet creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}