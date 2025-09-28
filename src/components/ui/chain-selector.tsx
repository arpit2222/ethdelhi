"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "./button";
import { Card } from "./card";
import { SUPPORTED_CHAINS } from "../../../lib/config";

interface ChainSelectorProps {
  className?: string;
  onChainSelect?: (chainId: number) => void;
  selectedChainId?: number;
  showBalance?: boolean;
  label?: string;
}

export function ChainSelector({ 
  className, 
  onChainSelect, 
  selectedChainId, 
  showBalance = false,
  label = "Select Chain"
}: ChainSelectorProps) {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);

  const handleChainSelect = async (chainId: number) => {
    try {
      if (onChainSelect) {
        onChainSelect(chainId);
      } else {
        await switchChain({ chainId });
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }
  };

  const getChainIcon = (chainId: number) => {
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
  };

  const getCurrentChain = () => {
    const currentChainId = selectedChainId || chain?.id;
    return SUPPORTED_CHAINS.find(c => c.id === currentChainId);
  };

  const currentChain = getCurrentChain();

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center">
          {currentChain ? (
            <>
              <span className="mr-2">{getChainIcon(currentChain.id)}</span>
              <span>{currentChain.name}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
              {label}
            </div>
            {SUPPORTED_CHAINS.map((supportedChain) => (
              <button
                key={supportedChain.id}
                onClick={() => handleChainSelect(supportedChain.id)}
                className={`w-full flex items-center justify-between p-3 rounded-md text-sm transition-colors ${
                  (selectedChainId || chain?.id) === supportedChain.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-lg">{getChainIcon(supportedChain.id)}</span>
                  <div className="text-left">
                    <div className="font-medium">{supportedChain.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {supportedChain.nativeCurrency.symbol} • Testnet
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {(selectedChainId || chain?.id) === supportedChain.id && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">Current</span>
                  )}
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

interface ChainDisplayProps {
  chainId: number;
  className?: string;
  showIcon?: boolean;
  showName?: boolean;
  showSymbol?: boolean;
}

export function ChainDisplay({ 
  chainId, 
  className = "", 
  showIcon = true, 
  showName = true, 
  showSymbol = false 
}: ChainDisplayProps) {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);

  if (!chain) {
    return <span className={className}>Unknown Chain</span>;
  }

  const getChainIcon = (chainId: number) => {
    switch (chain.name) {
      case "Sepolia": return "🔷";
      case "Celo Alfajores": return "🟡";
      case "Monad Testnet": return "🟣";
      case "Etherlink Testnet": return "🔵";
      case "Polkadot Westend Asset Hub": return "🟢";
      default: return "🔗";
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      {showIcon && (
        <span className="mr-2">{getChainIcon(chainId)}</span>
      )}
      {showName && (
        <span className="font-medium">{chain.name}</span>
      )}
      {showSymbol && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {chain.nativeCurrency.symbol}
        </span>
      )}
    </div>
  );
}

interface ChainStatusProps {
  chainId: number;
  className?: string;
}

export function ChainStatus({ chainId, className = "" }: ChainStatusProps) {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  
  if (!chain) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
        <span className="text-sm text-red-600 dark:text-red-400">Unsupported</span>
      </div>
    );
  }

  // Mock status - in production, check actual RPC status
  const isOnline = true;

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className={`text-sm ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
