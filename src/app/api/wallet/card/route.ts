import { NextRequest, NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { CeloraWalletService } from '@celora/infrastructure';

export async function POST(request: NextRequest) {
  // Temporary placeholder - TODO: Implement with Supabase direct calls
  return NextResponse.json({ message: 'Virtual card creation - under construction' }, { status: 200 });
}