import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Cross-platform recent - under construction' }, { status: 200 });
}