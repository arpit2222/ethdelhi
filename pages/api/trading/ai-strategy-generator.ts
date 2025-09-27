import { NextApiRequest, NextApiResponse } from 'next';

interface AIStrategyRequest {
  userInput: string;
  currentPrice?: number;
}

interface AIStrategyResponse {
  success: boolean;
  strategy?: {
    type: string;
    description: string;
    parameters: any;
    confidence: number;
  };
  error?: string;
}

// AI Strategy Generator (simplified version without 0G SDK for now)
async function generateAIStrategy(userInput: string, currentPrice?: number): Promise<any> {
  // For now, use rule-based AI until we can integrate 0G SDK
  const input = userInput.toLowerCase();
  
  // Detect strategy type from user input
  if (input.includes("gradually") || input.includes("over time") || input.includes("twap")) {
    return {
      strategy_type: "TWAP",
      description: "AI detected: Time-weighted average price strategy for gradual execution",
      parameters: {
        side: input.includes("sell") ? "SELL" : "BUY",
        amount: extractAmount(input) || 0.1,
        start_price: currentPrice || 3500,
        end_price: (currentPrice || 3500) * (input.includes("sell") ? 1.05 : 0.95),
        duration_hours: extractDuration(input) || 1,
        slices: 5
      },
      confidence: 85,
      reasoning: "TWAP strategy minimizes market impact by spreading trades over time"
    };
  }
  
  if (input.includes("ladder") || input.includes("multiple levels") || input.includes("steps")) {
    return {
      strategy_type: "Ladder",
      description: "AI detected: Ladder strategy for multiple price levels",
      parameters: {
        side: input.includes("sell") ? "SELL" : "BUY",
        amount: extractAmount(input) || 0.2,
        start_price: currentPrice || 3500,
        end_price: (currentPrice || 3500) * (input.includes("sell") ? 1.1 : 0.9),
        steps: 10
      },
      confidence: 80,
      reasoning: "Ladder strategy captures price movements across multiple levels"
    };
  }
  
  if (input.includes("dutch") || input.includes("auction") || input.includes("decreasing")) {
    return {
      strategy_type: "Dutch",
      description: "AI detected: Dutch auction strategy with decreasing price",
      parameters: {
        side: "SELL",
        amount: extractAmount(input) || 0.15,
        start_price: (currentPrice || 3500) * 1.05,
        duration_hours: extractDuration(input) || 0.5
      },
      confidence: 75,
      reasoning: "Dutch auction starts high and decreases to find optimal selling price"
    };
  }
  
  // Default simple strategy
  return {
    strategy_type: "Simple",
    description: "AI detected: Simple market order strategy",
    parameters: {
      side: input.includes("sell") ? "SELL" : "BUY",
      amount: extractAmount(input) || 0.1,
      limit_price: currentPrice || 3500
    },
    confidence: 70,
    reasoning: "Simple strategy for immediate execution at current market price"
  };
}

function extractAmount(input: string): number | null {
  const match = input.match(/(\d+\.?\d*)\s*eth/i);
  return match ? parseFloat(match[1]) : null;
}

function extractDuration(input: string): number | null {
  const hourMatch = input.match(/(\d+)\s*h/i);
  const minMatch = input.match(/(\d+)\s*m/i);
  if (hourMatch) return parseInt(hourMatch[1]);
  if (minMatch) return parseInt(minMatch[1]) / 60;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AIStrategyResponse>) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { userInput, currentPrice }: AIStrategyRequest = req.body;

    if (!userInput) {
      res.status(400).json({ success: false, error: 'User input is required' });
      return;
    }

    // Generate AI strategy
    const strategy = await generateAIStrategy(userInput, currentPrice);

    res.status(200).json({
      success: true,
      strategy: {
        type: strategy.strategy_type,
        description: strategy.description,
        parameters: strategy.parameters,
        confidence: strategy.confidence
      }
    });

  } catch (error) {
    console.error('AI Strategy Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
