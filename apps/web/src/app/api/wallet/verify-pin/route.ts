import { NextRequest, NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { CeloraWalletService } from '@celora/infrastructure';

export async function POST() {
  return NextResponse.json({ message: 'PIN verification - under construction' }, { status: 200 });
}