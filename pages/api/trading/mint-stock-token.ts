import { NextApiRequest, NextApiResponse } from "next";
import { StockMetadataService, StockMetadata } from "../../../lib/services/StockMetadataService";

interface MintStockTokenRequest {
  name: string;
  symbol: string;
  quantity: string;
  pricePerShare: string;
  stockSymbol: string;
  companyName: string;
  verificationDocumentHash: string;
  userAddress: string;
}

interface MintStockTokenResponse {
  success: boolean;
  token?: {
    tokenAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    metadataStorageId: string;
    etherscanUrl: string;
  };
  error?: string;
}

// Mock Stock Token Minter
class StockTokenMinter {
  private metadataService: StockMetadataService;

  constructor() {
    this.metadataService = new StockMetadataService();
  }

  async mintStockToken(request: MintStockTokenRequest): Promise<any> {
    try {
      // Mock transaction simulation
      const mockTokenAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const mockBlockNumber = Math.floor(Math.random() * 10000000) + 5000000;
      const mockGasUsed = Math.floor(Math.random() * 300000) + 150000;

      // Prepare stock metadata
      const stockMetadata: StockMetadata = {
        stockSymbol: request.stockSymbol,
        companyName: request.companyName,
        tokenAddress: mockTokenAddress,
        verificationDocumentHash: request.verificationDocumentHash,
        creatorAddress: request.userAddress,
        timestamp: Date.now(),
        totalShares: request.quantity,
        pricePerShare: request.pricePerShare
      };

      // Store metadata on 0G network (using our service)
      const storageResult = await this.metadataService.storeStockMetadata(stockMetadata);

      console.log("✅ Minted Stock Token:", {
        stockSymbol: request.stockSymbol,
        companyName: request.companyName,
        tokenAddress: mockTokenAddress,
        totalSupply: request.quantity,
        pricePerShare: request.pricePerShare
      });

      return {
        tokenAddress: mockTokenAddress,
        transactionHash: mockTxHash,
        blockNumber: mockBlockNumber,
        gasUsed: mockGasUsed.toString(),
        metadataStorageId: storageResult.storageId,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${mockTxHash}`
      };

    } catch (error) {
      console.error("❌ Failed to mint stock token:", error);
      throw error;
    }
  }
}

const stockTokenMinter = new StockTokenMinter();

export default async function handler(req: NextApiRequest, res: NextApiResponse<MintStockTokenResponse>) {
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
    const {
      name,
      symbol,
      quantity,
      pricePerShare,
      stockSymbol,
      companyName,
      verificationDocumentHash,
      userAddress
    }: MintStockTokenRequest = req.body;

    // Validate required fields
    if (!name || !symbol || !quantity || !stockSymbol || !companyName || !userAddress) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // Validate quantity and price
    if (parseFloat(quantity) <= 0 || parseFloat(pricePerShare) <= 0) {
      res.status(400).json({ success: false, error: "Quantity and price must be positive" });
      return;
    }

    // Mint stock token
    const token = await stockTokenMinter.mintStockToken({
      name,
      symbol,
      quantity,
      pricePerShare: pricePerShare || "1.0",
      stockSymbol,
      companyName,
      verificationDocumentHash: verificationDocumentHash || "",
      userAddress
    });

    res.status(200).json({
      success: true,
      token: {
        tokenAddress: token.tokenAddress,
        transactionHash: token.transactionHash,
        blockNumber: token.blockNumber,
        gasUsed: token.gasUsed,
        metadataStorageId: token.metadataStorageId,
        etherscanUrl: token.etherscanUrl
      }
    });

  } catch (error) {
    console.error("Stock Token Minting Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
