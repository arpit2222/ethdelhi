import { NextApiRequest, NextApiResponse } from "next";
import { StockMetadataService } from "../../../lib/services/StockMetadataService";

interface StockPortfolioRequest {
  userAddress: string;
}

interface StockToken {
  tokenAddress: string;
  stockSymbol: string;
  companyName: string;
  balance: string;
  totalSupply: string;
  pricePerShare: string;
  totalValue: string;
  verificationStatus: boolean;
  tokenizationDate: number;
  transactionHash: string;
  etherscanUrl: string;
}

interface StockPortfolioResponse {
  success: boolean;
  portfolio?: {
    tokens: StockToken[];
    totalTokens: number;
    totalValue: string;
    userAddress: string;
  };
  error?: string;
}

// Mock Portfolio Service
class StockPortfolioService {
  private metadataService: StockMetadataService;

  constructor() {
    this.metadataService = new StockMetadataService();
  }

  async getUserStockTokens(userAddress: string): Promise<StockToken[]> {
    try {
      // Mock portfolio data - in production, query the blockchain
      const mockTokens: StockToken[] = [
        {
          tokenAddress: "0x1234567890123456789012345678901234567890",
          stockSymbol: "AAPL",
          companyName: "Apple Inc.",
          balance: "100.0",
          totalSupply: "1000000.0",
          pricePerShare: "150.0",
          totalValue: "15000.0",
          verificationStatus: true,
          tokenizationDate: Date.now() - 86400000, // 1 day ago
          transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          etherscanUrl: "https://sepolia.etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        },
        {
          tokenAddress: "0x2345678901234567890123456789012345678901",
          stockSymbol: "GOOGL",
          companyName: "Alphabet Inc.",
          balance: "50.0",
          totalSupply: "500000.0",
          pricePerShare: "2800.0",
          totalValue: "140000.0",
          verificationStatus: true,
          tokenizationDate: Date.now() - 172800000, // 2 days ago
          transactionHash: "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          etherscanUrl: "https://sepolia.etherscan.io/tx/0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        }
      ];

      // Filter tokens owned by the user (in production, check actual balances)
      const userTokens = mockTokens.filter(token => 
        parseFloat(token.balance) > 0
      );

      console.log("📊 Retrieved user stock portfolio:", {
        userAddress,
        tokenCount: userTokens.length,
        totalValue: userTokens.reduce((sum, token) => sum + parseFloat(token.totalValue), 0)
      });

      return userTokens;

    } catch (error) {
      console.error("❌ Failed to get user stock tokens:", error);
      throw error;
    }
  }

  calculateTotalPortfolioValue(tokens: StockToken[]): string {
    const totalValue = tokens.reduce((sum, token) => {
      return sum + parseFloat(token.totalValue);
    }, 0);
    
    return totalValue.toFixed(2);
  }
}

const portfolioService = new StockPortfolioService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<StockPortfolioResponse>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { userAddress } = req.query as StockPortfolioRequest;

    if (!userAddress) {
      res.status(400).json({ success: false, error: "User address is required" });
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      res.status(400).json({ success: false, error: "Invalid Ethereum address format" });
      return;
    }

    // Get user's stock tokens
    const tokens = await portfolioService.getUserStockTokens(userAddress);
    const totalValue = portfolioService.calculateTotalPortfolioValue(tokens);

    res.status(200).json({
      success: true,
      portfolio: {
        tokens,
        totalTokens: tokens.length,
        totalValue,
        userAddress
      }
    });

  } catch (error) {
    console.error("Portfolio Retrieval Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
