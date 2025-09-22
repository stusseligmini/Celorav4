import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

// Mock Solana wallet functions (in production, use @solana/web3.js)
function generateSolanaKeypair() {
  // This would use Solana's Keypair.generate() in production
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = 'Sol' + crypto.randomBytes(16).toString('hex');
  return { privateKey, publicKey };
}

function encryptPrivateKey(privateKey: string, password: string) {
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, wallet_address, private_key, pin } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    switch (action) {
      case 'create':
        // Generate new Solana wallet
        const { privateKey, publicKey } = generateSolanaKeypair();
        const encryptedKey = encryptPrivateKey(privateKey, pin || user.id);

        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            blockchain: 'solana',
            address: publicKey,
            encrypted_private_key: encryptedKey,
            balance: 0,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'wallet_created',
          title: 'Solana Wallet Created',
          message: `New Solana wallet created: ${publicKey.substring(0, 8)}...`,
          priority: 'medium'
        });

        return NextResponse.json({
          success: true,
          wallet: {
            ...newWallet,
            encrypted_private_key: undefined // Don't return private key
          },
          message: 'Solana wallet created successfully'
        });

      case 'import':
        if (!wallet_address || !private_key) {
          return NextResponse.json({ 
            error: 'Wallet address and private key required for import' 
          }, { status: 400 });
        }

        const encryptedImportKey = encryptPrivateKey(private_key, pin || user.id);

        const { data: importedWallet, error: importError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            blockchain: 'solana',
            address: wallet_address,
            encrypted_private_key: encryptedImportKey,
            balance: 0,
            is_active: true
          })
          .select()
          .single();

        if (importError) {
          return NextResponse.json({ error: importError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          wallet: {
            ...importedWallet,
            encrypted_private_key: undefined
          },
          message: 'Solana wallet imported successfully'
        });

      case 'balance':
        if (!wallet_address) {
          return NextResponse.json({ 
            error: 'Wallet address required for balance check' 
          }, { status: 400 });
        }

        // In production, this would call Solana RPC
        const mockBalance = Math.random() * 10; // Random SOL balance

        // Update wallet balance
        const { error: balanceError } = await supabase
          .from('wallets')
          .update({ 
            balance: mockBalance,
            last_updated: new Date().toISOString()
          })
          .eq('address', wallet_address)
          .eq('user_id', user.id);

        if (balanceError) {
          return NextResponse.json({ error: balanceError.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          balance: mockBalance,
          currency: 'SOL',
          usd_value: mockBalance * 98.75, // Mock SOL price
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Solana wallet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Solana wallets
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, blockchain, address, balance, is_active, created_at, last_updated')
      .eq('user_id', user.id)
      .eq('blockchain', 'solana')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate total portfolio value
    const totalBalance = wallets?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;
    const totalUsdValue = totalBalance * 98.75; // Mock SOL price

    return NextResponse.json({
      success: true,
      wallets: wallets || [],
      portfolio: {
        total_sol: totalBalance,
        total_usd: totalUsdValue,
        wallet_count: wallets?.length || 0
      }
    });

  } catch (error) {
    console.error('Solana wallets fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}