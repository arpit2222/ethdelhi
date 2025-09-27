import { NextResponse } from 'next/server';
import { stopBot } from '@/lib/trading/botState';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST() {
  try {
    stopBot();
    return NextResponse.json({ success: true, message: 'Bot stopped successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to stop bot' }, { status: 500 });
  }
}
