import { z } from 'zod';
import { createRouteHandler, createAuthenticatedRouteHandler } from '@/lib/routeHandlerUtils';
import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/featureFlags';
import { supabaseServer } from '@/lib/supabase/server';

// Schema for creating a wallet
const createWalletSchema = z.object({
  wallet_name: z.string().min(1, { message: 'Wallet name is required' }),
  wallet_type: z.enum(['personal', 'business', 'savings']).default('personal'),
  currency: z.string().min(1).max(10).default('USD'),
  is_primary: z.boolean().default(false)
});

// Get all wallets for the authenticated user
export const GET = createAuthenticatedRouteHandler(
  async ({ userId }) => {
    try {
      // Initialize feature flags
      await featureFlags.initialize();

      // Check if wallet API is enabled
      const isWalletApiEnabled = await featureFlags.isEnabled('wallet_api', { defaultValue: true });
      if (!isWalletApiEnabled) {
        return NextResponse.json({ 
          error: 'Wallet API is currently disabled' 
        }, { status: 503 });
      }
      
      // Use server supabase client
      // Get all wallets for the authenticated user
      const { data: wallets, error } = await (supabaseServer as any)
        .from('wallets')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching wallets:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch wallets' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        data: wallets 
      });
    } catch (error: any) {
      console.error('Error retrieving wallets:', error);
      return NextResponse.json({ 
        error: error.message || 'Failed to retrieve wallets' 
      }, { status: 500 });
    }
  },
  {
    logging: true,
    rateLimit: {
      limit: 50,
      window: 60 // 1 minute
    },
    caching: {
      maxAge: 60, // 1 minute
      staleWhileRevalidate: 300 // 5 minutes
    }
  }
);

// Create a new wallet
export const POST = createAuthenticatedRouteHandler(
  async ({ req, userId }) => {
    try {
      // Initialize feature flags
      await featureFlags.initialize();

      // Check if wallet API is enabled
      const isWalletApiEnabled = await featureFlags.isEnabled('wallet_api', { defaultValue: true });
      if (!isWalletApiEnabled) {
        return NextResponse.json({ 
          error: 'Wallet API is currently disabled' 
        }, { status: 503 });
      }

      // Parse and validate request body
      const body = await req.json();
      const walletData = createWalletSchema.parse(body);
      
      // Use server supabase client
      // Create the wallet
      const { data: wallet, error } = await (supabaseServer as any)
        .from('wallets')
        .insert({
          user_id: userId,
          name: walletData.wallet_name,
          type: walletData.wallet_type,
          currency: walletData.currency,
          is_primary: walletData.is_primary,
          balance: 0,
          status: 'active'
        } as any)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating wallet:', error);
        return NextResponse.json({ 
          error: 'Failed to create wallet' 
        }, { status: 500 });
      }
      
      // If this wallet is marked as primary, update other wallets
      if (walletData.is_primary) {
        await (supabaseServer as any)
          .from('wallets')
          .update({ is_primary: false } as any)
          .eq('user_id', userId)
          .neq('id', wallet.id);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Wallet created successfully', 
        data: wallet 
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      
      if (error.name === 'ZodError') {
        return NextResponse.json({ 
          error: 'Validation error: ' + JSON.stringify(error.format())
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: error.message || 'Failed to create wallet' 
      }, { status: 500 });
    }
  },
  {
    validation: {
      body: createWalletSchema
    },
    rateLimit: {
      limit: 10,
      window: 60 // 1 minute
    },
    logging: true
  }
);
