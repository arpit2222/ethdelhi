import { NextResponse } from 'next/server';

interface AIStrategyRequest {
  userInput: string;
  currentPrice?: number;
}

// AI Strategy Generator (simplified version without 0G SDK for now)
async function generateAIStrategy(userInput: string, currentPrice?: number): Promise<any> {
  const input = userInput.toLowerCase();

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
        slices: 5,
      },
      confidence: 85,
      reasoning: "TWAP strategy minimizes market impact by spreading trades over time",
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
        steps: 10,
      },
      confidence: 80,
      reasoning: "Ladder strategy captures price movements across multiple levels",
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
        duration_hours: extractDuration(input) || 0.5,
      },
      confidence: 75,
      reasoning: "Dutch auction starts high and decreases to find optimal selling price",
    };
  }

  // Default simple strategy
  return {
    strategy_type: "Simple",
    description: "AI detected: Simple market order strategy",
    parameters: {
      side: input.includes("sell") ? "SELL" : "BUY",
      amount: extractAmount(input) || 0.1,
      limit_price: currentPrice || 3500,
    },
    confidence: 70,
    reasoning: "Simple strategy for immediate execution at current market price",
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
    const { userInput, currentPrice } = (await req.json()) as AIStrategyRequest;
    if (!userInput) {
      return NextResponse.json({ success: false, error: 'User input is required' }, { status: 400 });
    }

    const strategy = await generateAIStrategy(userInput, currentPrice);

    return NextResponse.json({
      success: true,
      strategy: {
        type: strategy.strategy_type,
        description: strategy.description,
        parameters: strategy.parameters,
        confidence: strategy.confidence,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
