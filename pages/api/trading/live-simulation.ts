import { NextApiRequest, NextApiResponse } from 'next';
import { botState, updatePrice } from '../../../lib/trading/botState';

interface SimulationData {
  currentPrice: number;
  priceHistory: Array<{time: number, price: number}>;
  strategies: any[];
  running: boolean;
  lastUpdate: number;
}

// Global simulation state
let simulationRunning = false;
let priceHistory: Array<{time: number, price: number}> = [];
let basePrice = 3456.78;
let lastUpdate = Date.now();

// Generate realistic price movement
function generateRealisticPrice(): number {
  const volatility = 0.005; // 0.5% volatility per update
  const trend = 0.0001; // Slight upward trend
  const randomChange = (Math.random() - 0.5) * volatility;
  
  basePrice = basePrice * (1 + randomChange + trend);
  
  // Keep price in reasonable range
  basePrice = Math.max(3200, Math.min(3700, basePrice));
  
  return parseFloat(basePrice.toFixed(2));
}

// Update price history
function updatePriceHistory(price: number) {
  const now = Date.now();
  priceHistory.push({
    time: Math.floor((now - lastUpdate) / 1000), // seconds since last update
    price: price
  });
  
  // Keep only last 50 data points
  if (priceHistory.length > 50) {
    priceHistory.shift();
  }
  
  // Update bot state
  updatePrice(price);
  lastUpdate = now;
}

// Simulate strategy execution
function simulateStrategyExecution() {
  if (!botState.running) return;
  
  botState.strategies.forEach(strategy => {
    if (strategy.status === 'active') {
      const now = Date.now();
      const elapsed = now - strategy.created_at * 1000;
      const total = (strategy.expires_at * 1000) - (strategy.created_at * 1000);
      
      if (elapsed >= total) {
        // Strategy completed
        strategy.status = 'completed';
        strategy.progress = 100;
      } else {
        // Update progress
        strategy.progress = Math.min(100, (elapsed / total) * 100);
        
        // Simulate trades based on strategy type
        if (strategy.mode === 'twap') {
          const expectedSlices = Math.floor((elapsed / total) * strategy.total_slices);
          if (expectedSlices > strategy.current_slice) {
            strategy.current_slice = expectedSlices;
            // Simulate a trade execution
            console.log(`TWAP Slice ${expectedSlices}/${strategy.total_slices} executed`);
          }
        }
      }
    }
  });
  
  botState.lastUpdate = Date.now();
}

// Start simulation
function startSimulation() {
  if (simulationRunning) return;
  
  simulationRunning = true;
  
  const interval = setInterval(() => {
    if (!botState.running) {
      clearInterval(interval);
      simulationRunning = false;
      return;
    }
    
    // Generate new price
    const newPrice = generateRealisticPrice();
    updatePriceHistory(newPrice);
    
    // Simulate strategy execution
    simulateStrategyExecution();
    
  }, 3000); // Update every 3 seconds
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SimulationData>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Start simulation if bot is running
    if (botState.running && !simulationRunning) {
      startSimulation();
    }
    
    // Generate current price
    const currentPrice = generateRealisticPrice();
    
    // If no price history, initialize it
    if (priceHistory.length === 0) {
      for (let i = 0; i < 20; i++) {
        priceHistory.push({
          time: i * 3,
          price: generateRealisticPrice()
        });
      }
    }
    
    // Update price history
    updatePriceHistory(currentPrice);
    
    const simulationData: SimulationData = {
      currentPrice,
      priceHistory: [...priceHistory],
      strategies: botState.strategies,
      running: botState.running,
      lastUpdate: Date.now()
    };
    
    res.status(200).json(simulationData);
    
  } catch (error) {
    console.error('Error in live simulation:', error);
    res.status(500).json({
      currentPrice: 3456.78,
      priceHistory: [],
      strategies: [],
      running: false,
      lastUpdate: Date.now()
    });
  }
}
