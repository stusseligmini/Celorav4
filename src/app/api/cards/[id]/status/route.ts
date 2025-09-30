import { NextRequest, NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { SupabaseService } from '@celora/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// PATCH /api/cards/[id]/status - Toggle card active/suspended
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // Temporary placeholder - TODO: Implement with Supabase direct calls
  return NextResponse.json({ 
    message: 'Card status update - under construction',
    success: true
  }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ message: 'Card status - under construction' }, { status: 200 });
}