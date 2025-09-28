import { NextApiRequest, NextApiResponse } from "next";
import { marketplaceStrategies, initializeSampleStrategies } from "../../../lib/trading/marketplace-storage";

interface MarketplaceResponse {
  success: boolean;
  strategies?: any[];
  strategy?: any;
  transactionHash?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MarketplaceResponse>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Initialize sample data
  initializeSampleStrategies();

  if (req.method === "GET") {
    const { tokenId } = req.query;
    
    if (tokenId) {
      // Get specific strategy
      const strategy = marketplaceStrategies.get(tokenId as string);
      if (strategy) {
        res.status(200).json({ success: true, strategy });
      } else {
        res.status(404).json({ success: false, error: "Strategy not found" });
      }
    } else {
      // Get all strategies
      const strategies = Array.from(marketplaceStrategies.values());
      res.status(200).json({ success: true, strategies });
    }
    return;
  }

  if (req.method === "POST") {
    const { action, tokenId, buyer, sealedKey, proof } = req.body;
    
    if (action === "purchase") {
      // Purchase strategy
      if (!tokenId || !buyer) {
        res.status(400).json({ success: false, error: "Missing required fields" });
        return;
      }

      const strategy = marketplaceStrategies.get(tokenId);
      if (!strategy) {
        res.status(404).json({ success: false, error: "Strategy not found" });
        return;
      }

      // Simulate purchase transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Update strategy stats
      strategy.purchases += 1;
      strategy.earnings = (strategy.earnings || 0) + strategy.price;
      
      res.status(200).json({ 
        success: true, 
        strategy,
        transactionHash: mockTxHash
      });
      return;
    }
    
    if (action === "execute") {
      // Execute strategy
      if (!tokenId || !proof) {
        res.status(400).json({ success: false, error: "Missing required fields" });
        return;
      }

      const strategy = marketplaceStrategies.get(tokenId);
      if (!strategy) {
        res.status(404).json({ success: false, error: "Strategy not found" });
        return;
      }

      // Simulate execution
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      res.status(200).json({ 
        success: true, 
        strategy,
        transactionHash: mockTxHash
      });
      return;
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed" });
}
