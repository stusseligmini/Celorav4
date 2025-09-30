'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/walletService';
import { featureFlags } from '@/lib/featureFlags';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  // Await params in Next.js 15
  const { walletId } = await params;
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
    
    // Get wallet details
    const wallet = await WalletService.getWallet(walletId);
    
    return NextResponse.json({ 
      success: true, 
      data: wallet 
    });
    
  } catch (error: any) {
    console.error(`Error retrieving wallet ${walletId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve wallet' 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
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
    
    const body = await request.json();
    
    // Update wallet
    const updatedWallet = await WalletService.updateWallet(walletId, {
      wallet_name: body.wallet_name,
      currency: body.currency,
      is_primary: body.is_primary
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Wallet updated successfully',
      data: updatedWallet 
    });
    
  } catch (error: any) {
    console.error(`Error updating wallet ${walletId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to update wallet' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
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
    
    // Delete wallet
    await WalletService.deleteWallet(walletId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Wallet deleted successfully'
    });
    
  } catch (error: any) {
    console.error(`Error deleting wallet ${walletId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to delete wallet' 
    }, { status: 500 });
  }
}