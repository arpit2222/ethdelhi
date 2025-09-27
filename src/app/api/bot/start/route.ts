import { NextResponse } from 'next/server';
import { startBot, updatePrice } from '@/lib/trading/botState';

interface BotStartRequest {
  mode: 'arbitrum' | 'solana' | 'background';
  strategy?: string;
}

async function fetchPythPrice(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'
    );
    const data = await response.json();
    const parsed = data.parsed || [];
    if (parsed.length === 0) return null;
    const priceObj = parsed[0].price || {};
    if (priceObj.price) return parseFloat(priceObj.price);
    if (parsed[0].price) return parseFloat(parsed[0].price);
    if (priceObj.ema_price) return parseFloat(priceObj.ema_price);
    return null;
  } catch (error) {
    return null;
  }
}

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

export async function POST(req: Request) {
  try {
    const { mode, strategy } = (await req.json()) as BotStartRequest;
    if (!mode) {
      return NextResponse.json({ success: false, message: 'Mode is required' }, { status: 400 });
    }

    startBot(mode, strategy);

    const currentPrice = await fetchPythPrice();
    if (currentPrice) updatePrice(currentPrice);
    else updatePrice(3500.0);

    return NextResponse.json({
      success: true,
      message: `Bot started in ${mode} mode${strategy ? ' with strategy' : ''}`,
      botId: `bot_${Date.now()}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to start bot', error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
