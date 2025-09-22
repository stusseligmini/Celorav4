import { NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { SupabaseService } from '@celora/infrastructure';
// import { VirtualCardDomain } from '@celora/domain';

export async function POST() {
  // Temporary placeholder - TODO: Implement with Supabase direct calls
  return NextResponse.json({ message: 'Card funding - under construction' }, { status: 200 });
}
