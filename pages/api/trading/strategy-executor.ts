import { NextApiRequest, NextApiResponse } from 'next';
import { botState, updatePrice } from '../../../lib/trading/botState';

interface StrategyExecutionResult {
  success: boolean;
  message: string;
  strategyId?: string;
  error?: string;
}

// Simulate strategy execution for demo purposes
async function executeStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  try {
    // Parse the strategy text (simplified)
    const parts = strategyText.toLowerCase().split(' ');
    
    if (parts.includes('twap')) {
      return await executeTWAPStrategy(strategyText);
    } else if (parts.includes('ladder')) {
      return await executeLadderStrategy(strategyText);
    } else if (parts.includes('dutch')) {
      return await executeDutchStrategy(strategyText);
    } else {
      return {
        success: false,
        message: 'Strategy type not recognized. Supported: TWAP, Ladder, Dutch'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error executing strategy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function executeTWAPStrategy(strategyText: string): Promise<StrategyExecutionResult> {
  // Extract parameters from strategy text
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
  
  // Create TWAP strategy
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
    last_execution: now
  };
  
  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  
  // Start simulation (in real implementation, this would execute actual trades)
  simulateTWAPExecution(strategy);
  
  return {
    success: true,
    message: `TWAP strategy started: ${amount} ETH over ${durationHours}h in ${slices} slices`,
    strategyId
  };
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
    expires_at: (now + 24 * 60 * 60 * 1000) / 1000, // 24 hours
    progress: 0,
    original_text: strategyText,
    amount,
    start_price: startPrice,
    end_price: endPrice,
    total_steps: steps,
    current_step: 0,
    price_step: (startPrice - endPrice) / steps
  };
  
  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  
  return {
    success: true,
    message: `Ladder strategy started: ${amount} ETH from $${startPrice} to $${endPrice} in ${steps} steps`,
    strategyId
  };
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
    end_price: startPrice * 0.9, // 10% discount at end
    duration_minutes: durationMinutes,
    price_decrement: (startPrice * 0.1) / durationMinutes // Decrease per minute
  };
  
  botState.strategies.push(strategy);
  botState.lastUpdate = now;
  
  return {
    success: true,
    message: `Dutch auction started: ${amount} ETH starting at $${startPrice} over ${durationMinutes}m`,
    strategyId
  };
}

// Simulate TWAP execution progress
function simulateTWAPExecution(strategy: any) {
  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - strategy.created_at * 1000;
    const total = strategy.expires_at * 1000 - strategy.created_at * 1000;
    
    if (elapsed >= total) {
      // Strategy completed
      strategy.status = 'completed';
      strategy.progress = 100;
      strategy.message = `✅ TWAP strategy completed! Executed ${strategy.total_slices} slices.`;
      botState.lastUpdate = now;
      clearInterval(interval);
      return;
    }
    
    // Update progress
    strategy.progress = Math.min(100, (elapsed / total) * 100);
    
    // Simulate slice execution
    const expectedSlices = Math.floor((elapsed / total) * strategy.total_slices);
    if (expectedSlices > strategy.current_slice) {
      strategy.current_slice = expectedSlices;
      strategy.message = `📈 Executing slice ${expectedSlices}/${strategy.total_slices}`;
      
      // Simulate a trade log
      console.log(`🔥 TWAP Trade: ${strategy.amount / strategy.total_slices} ETH at $${strategy.start_price + (strategy.end_price - strategy.start_price) * (expectedSlices / strategy.total_slices)}`);
    }
    
    botState.lastUpdate = now;
  }, 3000); // Update every 3 seconds for faster simulation
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<StrategyExecutionResult>) {
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
    const { strategy } = req.body;

    if (!strategy) {
      res.status(400).json({ success: false, message: 'Strategy text is required' });
      return;
    }

    const result = await executeStrategy(strategy);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error executing strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
