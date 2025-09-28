"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { SUPPORTED_CHAINS } from "../../lib/config";

export interface StockTokenData {
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
  chainId: number;
  chainName: string;
  bridgeStatus?: 'available' | 'bridging' | 'completed' | 'failed';
}

export interface MintStockTokenRequest {
  name: string;
  symbol: string;
  quantity: string;
  pricePerShare: string;
  stockSymbol: string;
  companyName: string;
  verificationDocumentHash: string;
  chainId?: number;
}

export interface MintStockTokenResponse {
  success: boolean;
  token?: {
    tokenAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    metadataStorageId: string;
    etherscanUrl: string;
    chainId: number;
    chainName: string;
  };
  error?: string;
}

export interface StockPortfolioResponse {
  success: boolean;
  portfolio?: {
    tokens: StockTokenData[];
    totalTokens: number;
    totalValue: string;
    userAddress: string;
    crossChainSummary: {
      [chainId: number]: {
        chainName: string;
        tokenCount: number;
        totalValue: string;
      };
    };
  };
  error?: string;
}

export interface BridgeTokenRequest {
  tokenAddress: string;
  sourceChainId: number;
  destChainId: number;
  amount: string;
  recipient: string;
}

export interface BridgeTokenResponse {
  success: boolean;
  transferId?: string;
  sourceEscrowAddress?: string;
  destEscrowAddress?: string;
  secretHash?: string;
  error?: string;
}

export function useStockTokens() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintStockToken = useCallback(async (request: MintStockTokenRequest): Promise<MintStockTokenResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/trading/mint-stock-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          userAddress: address,
          chainId: request.chainId || 11155111, // Default to Sepolia
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mint stock token");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getUserStockTokens = useCallback(async (chainId?: number): Promise<StockPortfolioResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = chainId 
        ? `/api/trading/stock-portfolio?userAddress=${address}&chainId=${chainId}`
        : `/api/trading/stock-portfolio?userAddress=${address}`;
        
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch stock portfolio");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getCrossChainPortfolio = useCallback(async (): Promise<StockPortfolioResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch tokens from all supported chains
      const chainPromises = SUPPORTED_CHAINS.map((chain: any) => 
        fetch(`/api/trading/stock-portfolio?userAddress=${address}&chainId=${chain.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }).then(res => res.json())
      );

      const chainResults = await Promise.all(chainPromises);
      
      // Aggregate results
      const allTokens: StockTokenData[] = [];
      const crossChainSummary: { [chainId: number]: { chainName: string; tokenCount: number; totalValue: string } } = {};
      let totalValue = 0;

      chainResults.forEach((result: any, index: number) => {
        const chain = SUPPORTED_CHAINS[index];
        if (result.success && result.portfolio?.tokens) {
          allTokens.push(...result.portfolio.tokens);
          const chainValue = parseFloat(result.portfolio.totalValue || "0");
          totalValue += chainValue;
          
          crossChainSummary[chain.id] = {
            chainName: chain.name,
            tokenCount: result.portfolio.tokens.length,
            totalValue: result.portfolio.totalValue || "0",
          };
        } else {
          crossChainSummary[chain.id] = {
            chainName: chain.name,
            tokenCount: 0,
            totalValue: "0",
          };
        }
      });

      return {
        success: true,
        portfolio: {
          tokens: allTokens,
          totalTokens: allTokens.length,
          totalValue: totalValue.toString(),
          userAddress: address,
          crossChainSummary,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const bridgeToken = useCallback(async (request: BridgeTokenRequest): Promise<BridgeTokenResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bridge/initiate-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          recipient: request.recipient || address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate bridge transfer");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getTokenBalance = useCallback(async (tokenAddress: string, chainId: number): Promise<string> => {
    // Mock implementation - in production, use contract calls
    return "0";
  }, []);

  const getTokenMetadata = useCallback(async (tokenAddress: string, chainId: number): Promise<Partial<StockTokenData> | null> => {
    // Mock implementation - in production, use contract calls
    return null;
  }, []);

  const verifyStockOwnership = useCallback(async (
    tokenAddress: string,
    verificationDocumentHash: string,
    chainId: number
  ): Promise<boolean> => {
    if (!address) {
      return false;
    }

    // Mock verification - in production, implement actual verification logic
    return true;
  }, [address]);

  const formatTokenAmount = useCallback((amount: string, decimals: number = 18): string => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  }, []);

  const parseTokenAmount = useCallback((amount: string, decimals: number = 18): string => {
    // Mock parsing - in production, use proper decimal handling
    return amount;
  }, []);

  const generateVerificationHash = useCallback((documentContent: string): string => {
    // Simple hash generation - in production, use crypto libraries
    let hash = 0;
    for (let i = 0; i < documentContent.length; i++) {
      const char = documentContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    isConnected: !!address,
    userAddress: address,

    // Actions
    mintStockToken,
    getUserStockTokens,
    getCrossChainPortfolio,
    bridgeToken,
    getTokenBalance,
    getTokenMetadata,
    verifyStockOwnership,

    // Utilities
    formatTokenAmount,
    parseTokenAmount,
    generateVerificationHash,
    clearError,
  };
}
