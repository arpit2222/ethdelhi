"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { Button } from "./button";
import { Card } from "./card";
import { SUPPORTED_CHAINS } from "../../../lib/config";

interface WalletConnectProps {
  className?: string;
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { switchChain } = useSwitchChain();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleSwitchChain = async (chainId: number) => {
    try {
      await switchChain({ chainId });
      setShowChainSelector(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }
  };

  const isSupportedChain = (chainId: number) => {
    return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(4);
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

  if (!isConnected) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connect Your Wallet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect your wallet to manage RWA tokens across 5 testnet chains
            </p>
          </div>
          
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>Supported networks: Sepolia, Celo Alfajores, Monad, Etherlink, Polkadot Westend</p>
            <p>Make sure you have testnet tokens for gas fees</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isSupportedChain(chain?.id || 0) ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatAddress(address!)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {balance ? `${formatBalance(balance.formatted)} ${balance.symbol}` : "Loading..."}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <span className="mr-1">{getChainIcon(chain?.id || 0)}</span>
              {chain?.name || "Unknown Network"}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            Manage
          </Button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowChainSelector(true);
                    setShowDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Switch Network
                </button>
                <button
                  onClick={() => disconnect()}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {!isSupportedChain(chain?.id || 0) && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Please switch to a supported testnet for RWA tokenization
            </span>
          </div>
        </div>
      )}

      {showChainSelector && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select Network</h4>
          <div className="space-y-2">
            {SUPPORTED_CHAINS.map((supportedChain) => (
              <button
                key={supportedChain.id}
                onClick={() => handleSwitchChain(supportedChain.id)}
                className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                  chain?.id === supportedChain.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-2">{getChainIcon(supportedChain.id)}</span>
                  <span>{supportedChain.name}</span>
                </div>
                {chain?.id === supportedChain.id && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">Current</span>
                )}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChainSelector(false)}
            className="w-full mt-3"
          >
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
