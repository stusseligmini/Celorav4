import { NextRequest, NextResponse } from 'next/server';
// import { CeloraWalletService } from '@celora/infrastructure';

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Virtual card creation - under construction' }, { status: 200 });
}
