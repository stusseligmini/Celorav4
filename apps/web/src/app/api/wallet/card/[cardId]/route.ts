import { NextRequest, NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { CeloraWalletService } from '@celora/infrastructure';

export async function GET() {
  return NextResponse.json({ message: 'Wallet card details - under construction' }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ message: 'Wallet card operations - under construction' }, { status: 200 });
}