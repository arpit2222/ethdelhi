import { NextResponse } from 'next/server';
import { botState, updatePrice } from '@/lib/trading/botState';

interface SimulationData {
  currentPrice: number;
  priceHistory: Array<{ time: number; price: number }>;
  strategies: any[];
  running: boolean;
  lastUpdate: number;
}

let simulationRunning = false;
let priceHistory: Array<{ time: number; price: number }> = [];
let basePrice = 3456.78;
let lastUpdate = Date.now();

function generateRealisticPrice(): number {
  const volatility = 0.005;
  const trend = 0.0001;
  const randomChange = (Math.random() - 0.5) * volatility;
  basePrice = basePrice * (1 + randomChange + trend);
  basePrice = Math.max(3200, Math.min(3700, basePrice));
  return parseFloat(basePrice.toFixed(2));
}

function updatePriceHistoryLocal(price: number) {
  const now = Date.now();
  priceHistory.push({ time: Math.floor((now - lastUpdate) / 1000), price });
  if (priceHistory.length > 50) priceHistory.shift();
  updatePrice(price);
  lastUpdate = now;
}

function simulateStrategyExecution() {
  if (!botState.running) return;
  botState.strategies.forEach((strategy: any) => {
    if (strategy.status === 'active') {
      const now = Date.now();
      const elapsed = now - strategy.created_at * 1000;
      const total = strategy.expires_at * 1000 - strategy.created_at * 1000;
      if (elapsed >= total) {
        strategy.status = 'completed';
        strategy.progress = 100;
      } else {
        strategy.progress = Math.min(100, (elapsed / total) * 100);
        if (strategy.mode === 'twap') {
          const expectedSlices = Math.floor((elapsed / total) * strategy.total_slices);
          if (expectedSlices > strategy.current_slice) {
            strategy.current_slice = expectedSlices;
            // log slice
          }
        }
      }
    }
  });
  botState.lastUpdate = Date.now();
}

function startSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;
  const interval = setInterval(() => {
    if (!botState.running) {
      clearInterval(interval);
      simulationRunning = false;
      return;
    }
    const newPrice = generateRealisticPrice();
    updatePriceHistoryLocal(newPrice);
    simulateStrategyExecution();
  }, 3000);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  try {
    if (botState.running && !simulationRunning) startSimulation();
    const currentPrice = generateRealisticPrice();
    if (priceHistory.length === 0) {
      for (let i = 0; i < 20; i++) {
        priceHistory.push({ time: i * 3, price: generateRealisticPrice() });
      }
    }
    updatePriceHistoryLocal(currentPrice);

    const simulationData: SimulationData = {
      currentPrice,
      priceHistory: [...priceHistory],
      strategies: botState.strategies,
      running: botState.running,
      lastUpdate: Date.now(),
    };

    return NextResponse.json(simulationData);
  } catch (error: any) {
    return NextResponse.json(
      { currentPrice: 3456.78, priceHistory: [], strategies: [], running: false, lastUpdate: Date.now() },
      { status: 500 }
    );
  }
}
