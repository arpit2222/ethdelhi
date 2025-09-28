import { NextApiRequest, NextApiResponse } from 'next';
import { startBot, stopBot, addStrategy, updatePrice, botState } from '../../../../lib/trading/botState';

interface BotStartRequest {
  mode: 'arbitrum' | 'solana' | 'background';
  strategy?: string;
}

interface BotResponse {
  success: boolean;
  message: string;
  botId?: string;
  error?: string;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<BotResponse>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const { mode, strategy }: BotStartRequest = req.body;

    if (!mode) {
      res.status(400).json({ success: false, message: 'Mode is required' });
      return;
    }

    // Start the bot
    startBot(mode, strategy);

    // Fetch current price from Pyth Network
    const currentPrice = await fetchPythPrice();
    if (currentPrice) {
      updatePrice(currentPrice);
    } else {
      // Use fallback price
      updatePrice(3500.0);
    }

    res.status(200).json({
      success: true,
      message: `Bot started in ${mode} mode${strategy ? ' with strategy' : ''}`,
      botId: `bot_${Date.now()}`,
    });

  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start bot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}