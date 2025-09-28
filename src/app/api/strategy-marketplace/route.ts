import { NextResponse } from 'next/server';
import { marketplaceStrategies, initializeSampleStrategies } from '@/lib/trading/marketplace-storage';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(req: Request) {
  try {
    initializeSampleStrategies();

    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');

    if (tokenId) {
      const strategy = marketplaceStrategies.get(tokenId);
      if (strategy) return NextResponse.json({ success: true, strategy });
      return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 });
    }

    const strategies = Array.from(marketplaceStrategies.values());
    return NextResponse.json({ success: true, strategies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, tokenId, buyer, sealedKey, proof } = body;

    if (action === 'purchase') {
      if (!tokenId || !buyer) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }
      const strategy = marketplaceStrategies.get(tokenId);
      if (!strategy) return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 });
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      strategy.purchases += 1;
      strategy.earnings = (strategy.earnings || 0) + strategy.price;
      return NextResponse.json({ success: true, strategy, transactionHash: mockTxHash });
    }

    if (action === 'execute') {
      if (!tokenId || !proof) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }
      const strategy = marketplaceStrategies.get(tokenId);
      if (!strategy) return NextResponse.json({ success: false, error: 'Strategy not found' }, { status: 404 });
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      return NextResponse.json({ success: true, strategy, transactionHash: mockTxHash });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
