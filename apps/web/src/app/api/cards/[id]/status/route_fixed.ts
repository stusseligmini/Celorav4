import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Card status - under construction' }, { status: 200 });
}

export async function PUT() {
  return NextResponse.json({ message: 'Card status update - under construction' }, { status: 200 });
}