import { NextRequest, NextResponse } from 'next/server';
// Temporarily disabled for Vercel deployment - TODO: Replace with Supabase direct calls
// import { SupabaseService } from '@celora/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/cards/[id]/risk - Get fraud risk score for card
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Temporary placeholder - TODO: Implement with Supabase direct calls
  return NextResponse.json({ 
    message: 'Card risk assessment - under construction',
    riskScore: 0.1,
    riskLevel: 'low'
  }, { status: 200 });
}