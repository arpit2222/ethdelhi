import { NextApiRequest, NextApiResponse } from 'next';

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

// Cache for price data to avoid too many API calls
let priceCache: PriceData | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5000; // 5 seconds

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

// Alternative price source - CoinGecko
async function fetchCoinGeckoPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    return data.ethereum?.usd || null;
  } catch (error) {
    console.error('Error fetching CoinGecko price:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const now = Date.now();
    
    // Use cache if recent enough
    if (priceCache && (now - lastFetch) < CACHE_DURATION) {
      res.status(200).json(priceCache);
      return;
    }

    // Try Pyth Network first
    let price = await fetchPythPrice();
    let source = 'Pyth Network';
    
    // Fallback to CoinGecko if Pyth fails
    if (!price) {
      price = await fetchCoinGeckoPrice();
      source = 'CoinGecko';
    }
    
    // Final fallback - use a realistic price around current market
    if (!price) {
      // Generate a realistic ETH price with some volatility
      const basePrice = 3456.78;
      const volatility = 0.02; // 2% volatility
      const randomChange = (Math.random() - 0.5) * volatility;
      price = basePrice * (1 + randomChange);
      source = 'Simulation';
    }

    // Update cache
    priceCache = {
      price,
      timestamp: now,
      source
    };
    lastFetch = now;

    res.status(200).json(priceCache);
    
  } catch (error) {
    console.error('Error in price feed:', error);
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
}
