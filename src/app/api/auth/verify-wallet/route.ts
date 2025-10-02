import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { seedPhraseToHash } from '@/lib/seedPhrase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Backup API: Starting wallet verification...');
    
    const { seedPhrase, walletEmail, hashHex } = await request.json();

    if (!seedPhrase || !Array.isArray(seedPhrase) || seedPhrase.length !== 12) {
      console.error('❌ Invalid seed phrase format');
      return NextResponse.json(
        { error: 'Invalid seed phrase format' },
        { status: 400 }
      );
    }

    if (!walletEmail || !hashHex) {
      console.error('❌ Missing wallet email or hash');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('📧 Verifying wallet email:', walletEmail);
    console.log('🔐 Hash preview:', hashHex.slice(0, 8) + '...');

    // Verify the seed phrase generates the correct hash
    const verifyHashHex = await seedPhraseToHash(seedPhrase);
    if (verifyHashHex !== hashHex) {
      console.error('❌ Hash verification failed');
      return NextResponse.json(
        { error: 'Seed phrase verification failed' },
        { status: 401 }
      );
    }

    console.log('✅ Hash verification successful');

    // Try to find the user by email using admin API
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === walletEmail);
      
      if (!user) {
        console.error('❌ No user found with wallet email');
        return NextResponse.json(
          { error: 'No wallet found with this seed phrase' },
          { status: 404 }
        );
      }

      console.log('👤 User found:', user.id);

      // Generate a session token for the user using admin API
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: walletEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`
        }
      });

      if (sessionError) {
        console.error('❌ Session generation failed:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }

      console.log('🎉 Wallet verification completed successfully');
      return NextResponse.json(
        { 
          success: true, 
          message: 'Wallet verified successfully',
          user: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name,
            wallet_type: 'seed_phrase'
          },
          actionLink: sessionData.properties?.action_link
        },
        { status: 200 }
      );

    } catch (userError) {
      console.error('❌ User lookup error:', userError);
      return NextResponse.json(
        { error: 'Failed to verify wallet' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💥 Wallet verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
