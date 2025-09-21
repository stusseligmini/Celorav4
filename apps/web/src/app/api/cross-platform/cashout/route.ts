import { NextRequest, NextResponse } from 'next/server';
import { CrossPlatformService } from '@celora/infrastructure';
import { z } from 'zod';

const CashoutRequestSchema = z.object({
  walletId: z.string().uuid(),
  cardId: z.string().uuid(),
  amount: z.number().positive(),
  sourceCurrency: z.string().min(2).max(10),
  targetCurrency: z.string().min(2).max(10),
  exchangeRate: z.number().positive().optional(),
  providerRef: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CashoutRequestSchema.parse(body);

    // Get user ID from session/auth (placeholder for now)
    const userId = request.headers.get('x-user-id') || 'demo-user-id';

    const crossPlatformService = new CrossPlatformService();
    const result = await crossPlatformService.createCashout({
      userId,
      transactionType: 'cashout',
      ...validatedData
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      message: 'Cashout transaction created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Cashout API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}