// Shared bot state for Vercel functions
export interface BotState {
  running: boolean;
  mode: string | null;
  strategies: any[];
  lastUpdate: number;
  priceHistory: number[];
  currentPrice: number | null;
}

// In-memory bot state (in production, use a database like Redis or PostgreSQL)
export let botState: BotState = {
  running: false,
  mode: null,
  strategies: [],
  lastUpdate: Date.now(),
  priceHistory: [],
  currentPrice: null,
};

// Helper functions to manage bot state
export function startBot(mode: string, strategy?: string) {
  botState.running = true;
  botState.mode = mode;
  botState.lastUpdate = Date.now();

  if (strategy) {
    const strategyId = `vercel_${Date.now()}`;
    botState.strategies.push({
      id: strategyId,
      mode: 'twap',
      side: 'BUY',
      status: 'active',
      created_at: Date.now() / 1000,
      expires_at: (Date.now() / 1000) + 3600,
      progress: 0,
      original_text: strategy,
    });
  }
}

export function stopBot() {
  botState.running = false;
  botState.mode = null;
  botState.strategies = [];
  botState.lastUpdate = Date.now();
}

export function addStrategy(strategy: string) {
  const strategyId = `vercel_${Date.now()}`;
  botState.strategies.push({
    id: strategyId,
    mode: 'twap',
    side: 'BUY',
    status: 'active',
    created_at: Date.now() / 1000,
    expires_at: (Date.now() / 1000) + 3600,
    progress: 0,
    original_text: strategy,
  });
  botState.lastUpdate = Date.now();
}

export function updatePrice(price: number) {
  botState.currentPrice = price;
  botState.priceHistory.push(price);
  
  // Keep only last 20 prices
  if (botState.priceHistory.length > 20) {
    botState.priceHistory.shift();
  }
  
  botState.lastUpdate = Date.now();
}
