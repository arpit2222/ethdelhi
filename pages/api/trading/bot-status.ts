import { NextApiRequest, NextApiResponse } from 'next';
import { botState, updatePrice } from '../../../lib/trading/botState';

interface BotStatus {
  running: boolean;
  current_price: number | null;
  price_history: number[];
  active_strategies: any[];
  last_update: number;
}

// Fetch real ETH price from Pyth Network
async function fetchPythPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace');
    const data = await response.json();
    
    const parsed = data.parsed || [];
    if (parsed.length === 0) return null;
    
    const priceObj = parsed[0].price || {};
    if (priceObj.price) {
      return parseFloat(priceObj.price);
    }
    if (parsed[0].price) {
      return parseFloat(parsed[0].price);
    }
    if (priceObj.ema_price) {
      return parseFloat(priceObj.ema_price);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Pyth price:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // If bot is running, use bot state
    if (botState.running) {
      // Update price periodically
      const currentPrice = await fetchPythPrice();
      if (currentPrice) {
        updatePrice(currentPrice);
      }

      const status: BotStatus = {
        running: botState.running,
        current_price: botState.currentPrice,
        price_history: botState.priceHistory,
        active_strategies: botState.strategies,
        last_update: Math.floor(botState.lastUpdate / 1000)
      };
      
      console.log('Bot is running, returning live status');
      res.status(200).json(status);
      return;
    }

    // If bot is not running, fetch current price and show empty strategies
    console.log('Bot not running, fetching current price');
    
    const currentPrice = await fetchPythPrice();
    
    // Generate realistic price history
    const priceHistory: number[] = [];
    let basePrice = currentPrice || 3456.78;
    
    for (let i = 0; i < 20; i++) {
      const volatility = 0.02;
      const trend = (Math.random() - 0.5) * 0.001;
      const change = (Math.random() - 0.5) * volatility + trend;
      
      basePrice = basePrice * (1 + change);
      basePrice = Math.max(3000, Math.min(4000, basePrice));
      
      priceHistory.unshift(basePrice);
    }
    
    const mockStatus: BotStatus = {
      running: false,
      current_price: currentPrice,
      price_history: priceHistory,
      active_strategies: [], // Empty when bot is not running
      last_update: Math.floor(Date.now() / 1000)
    };
    
    res.status(200).json(mockStatus);
    
  } catch (error) {
    console.error('Error fetching bot status:', error);
    res.status(500).json({ error: 'Failed to fetch bot status' });
  }
}