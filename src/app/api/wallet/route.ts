'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WalletService, CreateWalletParams } from '@/lib/walletService';
import { featureFlags } from '@/lib/featureFlags';

export async function POST(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();

    // Check if wallet API is enabled
    const isWalletApiEnabled = featureFlags.isEnabled('wallet_api', { defaultValue: true });
    if (!isWalletApiEnabled) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet API is currently disabled' 
      }, { status: 503 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.wallet_name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet name is required' 
      }, { status: 400 });
    }
    
    // Create wallet
    const walletParams: CreateWalletParams = {
      wallet_name: body.wallet_name,
      wallet_type: body.wallet_type,
      currency: body.currency,
      is_primary: body.is_primary
    };
    
    const wallet = await WalletService.createWallet(walletParams);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Wallet created successfully', 
      data: wallet 
    });
    
  } catch (error: any) {
    console.error('Error creating wallet:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to create wallet' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize feature flags
    await featureFlags.initialize();

    // Check if wallet API is enabled
    const isWalletApiEnabled = featureFlags.isEnabled('wallet_api', { defaultValue: true });
    if (!isWalletApiEnabled) {
      return NextResponse.json({ 
        success: false, 
        message: 'Wallet API is currently disabled' 
      }, { status: 503 });
    }
    
    // Get all wallets for the authenticated user
    const wallets = await WalletService.getUserWallets();
    
    return NextResponse.json({ 
      success: true, 
      data: wallets 
    });
    
  } catch (error: any) {
    console.error('Error retrieving wallets:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve wallets' 
    }, { status: 500 });
  }
}