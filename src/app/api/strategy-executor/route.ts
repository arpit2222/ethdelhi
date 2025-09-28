import { NextResponse } from 'next/server';
import { botState } from '@/lib/trading/botState';

interface StrategyExecutionResult {
  success: boolean;
  message: string;
  strategyId?: string;
  error?: string;
}

async function executeStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  const parts = strategyText.toLowerCase().split(' ');
  if (parts.includes('twap')) return await executeTWAPStrategy(strategyText);
  if (parts.includes('ladder')) return await executeLadderStrategy(strategyText);
  if (parts.includes('dutch')) return await executeDutchStrategy(strategyText);
  return { success: false, message: 'Strategy type not recognized. Supported: TWAP, Ladder, Dutch' };
}

async function executeTWAPStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  const amountMatch = strategyText.match(/(\d+\.?\d*)\s*eth/i);
  const startPriceMatch = strategyText.match(/from\s*(\d+\.?\d*)/i);
  const endPriceMatch = strategyText.match(/to\s*(\d+\.?\d*)/i);
  const durationMatch = strategyText.match(/over\s*(\d+)h/i);
  const slicesMatch = strategyText.match(/in\s*(\d+)\s*slices/i);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.1;
  const startPrice = startPriceMatch ? parseFloat(startPriceMatch[1]) : 3500;
  const endPrice = endPriceMatch ? parseFloat(endPriceMatch[1]) : 3400;
  const durationHours = durationMatch ? parseInt(durationMatch[1]) : 1;
  const slices = slicesMatch ? parseInt(slicesMatch[1]) : 5;

  const strategyId = `twap_${Date.now()}`;
  const now = Date.now();
  const durationMs = durationHours * 60 * 60 * 1000;

  const strategy = {
    id: strategyId,
    mode: 'twap',
    side: 'BUY',
    status: 'active',
    created_at: now / 1000,
    expires_at: (now + durationMs) / 1000,
    progress: 0,
    original_text: strategyText,
    amount,
    start_price: startPrice,
    end_price: endPrice,
    duration_hours: durationHours,
    total_slices: slices,
    slice_interval: durationMs / slices,
    current_slice: 0,
    last_execution: now,
  } as any;

  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  return { success: true, message: `TWAP strategy started: ${amount} ETH over ${durationHours}h in ${slices} slices`, strategyId };
}

async function executeLadderStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  const amountMatch = strategyText.match(/(\d+\.?\d*)\s*eth/i);
  const startPriceMatch = strategyText.match(/from\s*(\d+\.?\d*)/i);
  const endPriceMatch = strategyText.match(/to\s*(\d+\.?\d*)/i);
  const stepsMatch = strategyText.match(/in\s*(\d+)\s*steps/i);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.5;
  const startPrice = startPriceMatch ? parseFloat(startPriceMatch[1]) : 3600;
  const endPrice = endPriceMatch ? parseFloat(endPriceMatch[1]) : 3400;
  const steps = stepsMatch ? parseInt(stepsMatch[1]) : 10;

  const strategyId = `ladder_${Date.now()}`;
  const now = Date.now();

  const strategy = {
    id: strategyId,
    mode: 'ladder',
    side: 'BUY',
    status: 'active',
    created_at: now / 1000,
    expires_at: (now + 24 * 60 * 60 * 1000) / 1000,
    progress: 0,
    original_text: strategyText,
    amount,
    start_price: startPrice,
    end_price: endPrice,
    total_steps: steps,
    current_step: 0,
    price_step: (startPrice - endPrice) / steps,
  } as any;

  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  return { success: true, message: `Ladder strategy started: ${amount} ETH from $${startPrice} to $${endPrice} in ${steps} steps`, strategyId };
}

async function executeDutchStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  const amountMatch = strategyText.match(/(\d+\.?\d*)\s*eth/i);
  const startPriceMatch = strategyText.match(/starting\s*at\s*(\d+\.?\d*)/i);
  const durationMatch = strategyText.match(/over\s*(\d+)m/i);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.2;
  const startPrice = startPriceMatch ? parseFloat(startPriceMatch[1]) : 3800;
  const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 30;

  const strategyId = `dutch_${Date.now()}`;
  const now = Date.now();
  const durationMs = durationMinutes * 60 * 1000;

  const strategy = {
    id: strategyId,
    mode: 'dutch',
    side: 'SELL',
    status: 'active',
    created_at: now / 1000,
    expires_at: (now + durationMs) / 1000,
    progress: 0,
    original_text: strategyText,
    amount,
    start_price: startPrice,
    end_price: startPrice * 0.9,
    duration_minutes: durationMinutes,
    price_decrement: (startPrice * 0.1) / durationMinutes,
  } as any;

  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  return { success: true, message: `Dutch auction started: ${amount} ETH starting at $${startPrice} over ${durationMinutes}m`, strategyId };
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
    const { strategy } = await req.json();
    if (!strategy) return NextResponse.json({ success: false, message: 'Strategy text is required' }, { status: 400 });

    const result = await executeStrategy(strategy);
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
