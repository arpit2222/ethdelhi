"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { SUPPORTED_CHAINS } from "../../lib/config";

export interface BridgeTransfer {
  transferId: string;
  sourceChain: string;
  destChain: string;
  tokenAddress: string;
  amount: string;
  recipient: string;
  status: 'pending' | 'escrow_created' | 'resolver_selected' | 'in_progress' | 'completed' | 'failed' | 'expired';
  sourceEscrowAddress?: string;
  destEscrowAddress?: string;
  secretHash?: string;
  timeout?: number;
  createdAt: number;
  completedAt?: number;
  resolverInfo?: {
    resolverAddress: string;
    bidAmount: string;
    commitmentDeadline: number;
    executionDeadline: number;
  };
}

export interface InitiateBridgeRequest {
  sourceChain: string;
  destChain: string;
  tokenAddress: string;
  amount: string;
  recipient: string;
  timeout?: number;
}

export interface InitiateBridgeResponse {
  success: boolean;
  transferId?: string;
  sourceEscrowAddress?: string;
  destEscrowAddress?: string;
  secretHash?: string;
  resolverCoordination?: any;
  error?: string;
}

export interface BridgeStatusResponse {
  success: boolean;
  transfer?: BridgeTransfer;
  error?: string;
}

export interface BridgeFeeEstimate {
  sourceChain: string;
  destChain: string;
  estimatedFee: string;
  estimatedTime: string;
  availableResolvers: number;
}

export function useCrossChainBridge() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<BridgeTransfer[]>([]);

  const initiateBridge = useCallback(async (request: InitiateBridgeRequest): Promise<InitiateBridgeResponse> => {
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

      // Add to active transfers
      if (data.success && data.transferId) {
        const newTransfer: BridgeTransfer = {
          transferId: data.transferId,
          sourceChain: request.sourceChain,
          destChain: request.destChain,
          tokenAddress: request.tokenAddress,
          amount: request.amount,
          recipient: request.recipient || address,
          status: 'pending',
          sourceEscrowAddress: data.sourceEscrowAddress,
          destEscrowAddress: data.destEscrowAddress,
          secretHash: data.secretHash,
          timeout: request.timeout || 3600,
          createdAt: Date.now(),
        };

        setActiveTransfers(prev => [...prev, newTransfer]);
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

  const getBridgeStatus = useCallback(async (transferId: string): Promise<BridgeStatusResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bridge/status?transferId=${transferId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bridge status");
      }

      // Update active transfers
      if (data.success && data.transfer) {
        setActiveTransfers(prev => 
          prev.map(transfer => 
            transfer.transferId === transferId ? data.transfer : transfer
          )
        );
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAvailableChains = useCallback((): Array<{ id: number; name: string; symbol: string }> => {
    return SUPPORTED_CHAINS.map(chain => ({
      id: chain.id,
      name: chain.name,
      symbol: chain.nativeCurrency.symbol,
    }));
  }, []);

  const estimateBridgeFee = useCallback(async (
    sourceChain: string,
    destChain: string,
    amount: string
  ): Promise<BridgeFeeEstimate> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bridge/estimate-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceChain,
          destChain,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to estimate bridge fee");
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getBridgeHistory = useCallback(async (): Promise<BridgeTransfer[]> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bridge/history?userAddress=${address}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bridge history");
      }

      return data.transfers || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const cancelBridge = useCallback(async (transferId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bridge/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transferId,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel bridge transfer");
      }

      // Remove from active transfers
      setActiveTransfers(prev => 
        prev.filter(transfer => transfer.transferId !== transferId)
      );

      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Poll for status updates on active transfers
  useEffect(() => {
    if (activeTransfers.length === 0) return;

    const interval = setInterval(async () => {
      for (const transfer of activeTransfers) {
        if (transfer.status === 'pending' || transfer.status === 'in_progress') {
          try {
            await getBridgeStatus(transfer.transferId);
          } catch (error) {
            console.error(`Failed to update status for transfer ${transfer.transferId}:`, error);
          }
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [activeTransfers, getBridgeStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getChainName = useCallback((chainId: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    return chain?.name || "Unknown Chain";
  }, []);

  const getChainIcon = useCallback((chainId: number): string => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) return "🔗";
    
    switch (chain.name) {
      case "Sepolia": return "🔷";
      case "Celo Alfajores": return "🟡";
      case "Monad Testnet": return "🟣";
      case "Etherlink Testnet": return "🔵";
      case "Polkadot Westend Asset Hub": return "🟢";
      default: return "🔗";
    }
  }, []);

  const formatBridgeStatus = useCallback((status: string): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'escrow_created': return 'Escrow Created';
      case 'resolver_selected': return 'Resolver Selected';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'expired': return 'Expired';
      default: return status;
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    activeTransfers,
    isConnected: !!address,

    // Actions
    initiateBridge,
    getBridgeStatus,
    getAvailableChains,
    estimateBridgeFee,
    getBridgeHistory,
    cancelBridge,

    // Utilities
    clearError,
    getChainName,
    getChainIcon,
    formatBridgeStatus,
  };
}
