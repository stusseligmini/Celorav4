import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@celora/infrastructure';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// PATCH /api/cards/[id]/status - Toggle card active/suspended
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    if (!status || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be "active" or "suspended"' 
      }, { status: 400 });
    }

    const supabaseService = new SupabaseService();
    const success = await supabaseService.updateCardStatus(params.id, user.id, status);

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to update card status' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      cardId: params.id, 
      status 
    });

  } catch (error) {
    console.error('Card status update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}