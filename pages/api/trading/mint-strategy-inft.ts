import { NextApiRequest, NextApiResponse } from "next";
import { marketplaceStrategies } from "../../../lib/trading/marketplace-storage";

interface MintStrategyRequest {
  strategy: {
    type: string;
    description: string;
    parameters: any;
    confidence: number;
    reasoning?: string;
  };
  strategyName: string;
  strategyDescription: string;
  price: number;
  creator: string;
}

interface MintStrategyResponse {
  success: boolean;
  iNFT?: {
    tokenId: string;
    contractAddress: string;
    transactionHash: string;
    metadataHash: string;
    marketplaceUrl: string;
  };
  error?: string;
}

// Mock iNFT Strategy Minter
class StrategyINFTMinter {
  async mintStrategyAsINFT(request: MintStrategyRequest): Promise<any> {
    try {
      // Simulate minting
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const mockTokenId = Math.floor(Math.random() * 1000000).toString();
      const mockMetadataHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Create marketplace entry
      const marketplaceEntry = {
        tokenId: mockTokenId,
        name: request.strategyName,
        description: request.strategyDescription,
        type: request.strategy.type,
        confidence: request.strategy.confidence,
        price: request.price,
        purchases: 0,
        earnings: 0,
        creator: request.creator,
        parameters: request.strategy.parameters,
        createdAt: Date.now(),
        transactionHash: mockTxHash,
        metadataHash: mockMetadataHash
      };
      
      // Add to marketplace
      marketplaceStrategies.set(mockTokenId, marketplaceEntry);
      
      console.log(" Minted Strategy iNFT:", {
        tokenId: mockTokenId,
        strategyType: request.strategy.type,
        confidence: request.strategy.confidence,
        price: request.price
      });
      
      return {
        tokenId: mockTokenId,
        contractAddress: "0x1234567890123456789012345678901234567890",
        transactionHash: mockTxHash,
        metadataHash: mockMetadataHash,
        marketplaceUrl: `/api/strategy-marketplace?tokenId=${mockTokenId}`
      };
      
    } catch (error) {
      console.error(" Failed to mint strategy as iNFT:", error);
      throw error;
    }
  }
}

const strategyMinter = new StrategyINFTMinter();

export default async function handler(req: NextApiRequest, res: NextApiResponse<MintStrategyResponse>) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { strategy, strategyName, strategyDescription, price, creator }: MintStrategyRequest = req.body;

    if (!strategy || !strategyName || !creator) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // Mint strategy as iNFT
    const iNFT = await strategyMinter.mintStrategyAsINFT({
      strategy,
      strategyName,
      strategyDescription: strategyDescription || strategy.description,
      price: price || 0.01,
      creator
    });

    res.status(200).json({
      success: true,
      iNFT: {
        tokenId: iNFT.tokenId,
        contractAddress: iNFT.contractAddress,
        transactionHash: iNFT.transactionHash,
        metadataHash: iNFT.metadataHash,
        marketplaceUrl: iNFT.marketplaceUrl
      }
    });

  } catch (error) {
    console.error("iNFT Minting Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

