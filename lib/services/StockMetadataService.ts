import { ethers } from "ethers";

export interface StockMetadata {
  stockSymbol: string;
  companyName: string;
  tokenAddress: string;
  verificationDocumentHash: string;
  creatorAddress: string;
  timestamp: number;
  totalShares: string;
  pricePerShare: string;
}

export interface StorageResult {
  storageId: string;
  transactionHash: string;
  timestamp: string;
  status: "success" | "error";
  error?: string;
}

export class StockMetadataService {
  private storageEndpoint: string;

  constructor(storageEndpoint?: string) {
    this.storageEndpoint = storageEndpoint || process.env.NEXT_PUBLIC_ZERO_G_RPC_URL || "";
  }

  async storeStockMetadata(metadata: StockMetadata): Promise<StorageResult> {
    try {
      // For now, we'll simulate storage and return a mock result
      // You can integrate with your 0G SDK here
      const mockStorageId = `stock_${metadata.stockSymbol}_${Date.now()}`;
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Store in local memory for development
      if (typeof window === 'undefined') {
        // Server-side: store in a simple in-memory cache
        this.storeInMemory(mockStorageId, metadata);
      }

      return {
        storageId: mockStorageId,
        transactionHash: mockTxHash,
        timestamp: new Date().toISOString(),
        status: "success"
      };

    } catch (error) {
      return {
        storageId: "",
        transactionHash: "",
        timestamp: new Date().toISOString(),
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async storeVerificationDocument(
    documentContent: string, 
    documentType: string = "kyc"
  ): Promise<StorageResult & { documentHash: string }> {
    try {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));
      const mockStorageId = `doc_${documentType}_${Date.now()}`;
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      return {
        storageId: mockStorageId,
        documentHash,
        transactionHash: mockTxHash,
        timestamp: new Date().toISOString(),
        status: "success"
      };

    } catch (error) {
      return {
        storageId: "",
        documentHash: "",
        transactionHash: "",
        timestamp: new Date().toISOString(),
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async getStockMetadata(identifier: string): Promise<StockMetadata | null> {
    try {
      // Mock retrieval - integrate with your 0G SDK
      const mockData = this.retrieveFromMemory(identifier);
      return mockData;
    } catch (error) {
      console.error("Error retrieving stock metadata:", error);
      return null;
    }
  }

  private storeInMemory(storageId: string, metadata: StockMetadata): void {
    // Simple in-memory storage for development
    if (!global.stockMetadataCache) {
      global.stockMetadataCache = new Map();
    }
    global.stockMetadataCache.set(storageId, metadata);
  }

  private retrieveFromMemory(identifier: string): StockMetadata | null {
    if (!global.stockMetadataCache) {
      return null;
    }
    return global.stockMetadataCache.get(identifier) || null;
  }

  generateVerificationHash(documentContent: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(documentContent));
  }
}

// Extend global type for TypeScript
declare global {
  var stockMetadataCache: Map<string, StockMetadata> | undefined;
}

