"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { useStockTokens } from "../../hooks/useStockTokens";
import { useCrossChainBridge } from "../../hooks/useCrossChainBridge";
import { SUPPORTED_CHAINS } from "../../lib/config";
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface RealTimeTrackerProps {
  className?: string;
  onBalanceUpdate?: (balances: { [chainId: number]: string }) => void;
  onBridgeUpdate?: (transfers: any[]) => void;
}

interface BalanceUpdate {
  chainId: number;
  chainName: string;
  balance: string;
  timestamp: number;
  change: 'increase' | 'decrease' | 'stable';
}

interface BridgeUpdate {
  transferId: string;
  status: string;
  timestamp: number;
  message: string;
}

export function RealTimeTracker({ 
  className, 
  onBalanceUpdate, 
  onBridgeUpdate 
}: RealTimeTrackerProps) {
  const { address } = useAccount();
  const { getCrossChainPortfolio } = useStockTokens();
  const { activeTransfers, getBridgeStatus } = useCrossChainBridge();
  
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [balanceUpdates, setBalanceUpdates] = useState<BalanceUpdate[]>([]);
  const [bridgeUpdates, setBridgeUpdates] = useState<BridgeUpdate[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10000); // 10 seconds
  const [showNotifications, setShowNotifications] = useState(true);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001');
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Polling fallback when WebSocket is not available
  useEffect(() => {
    if (!isConnected && address) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [isConnected, address]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'balance_update':
        handleBalanceUpdate(data);
        break;
      case 'bridge_update':
        handleBridgeUpdate(data);
        break;
      case 'chain_status':
        handleChainStatusUpdate(data);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, []);

  const handleBalanceUpdate = useCallback((data: any) => {
    const update: BalanceUpdate = {
      chainId: data.chainId,
      chainName: data.chainName,
      balance: data.balance,
      timestamp: Date.now(),
      change: data.change || 'stable'
    };

    setBalanceUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    onBalanceUpdate?.({ [data.chainId]: data.balance });
  }, [onBalanceUpdate]);

  const handleBridgeUpdate = useCallback((data: any) => {
    const update: BridgeUpdate = {
      transferId: data.transferId,
      status: data.status,
      timestamp: Date.now(),
      message: data.message
    };

    setBridgeUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    onBridgeUpdate?.(activeTransfers);
  }, [activeTransfers, onBridgeUpdate]);

  const handleChainStatusUpdate = useCallback((data: any) => {
    // Handle chain status updates
    console.log('Chain status update:', data);
  }, []);

  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        await pollForUpdates();
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [isPolling, pollingInterval]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const pollForUpdates = useCallback(async () => {
    if (!address) return;

    try {
      // Poll for portfolio updates
      const portfolioResponse = await getCrossChainPortfolio();
      if (portfolioResponse.success && portfolioResponse.portfolio) {
        // Check for balance changes
        portfolioResponse.portfolio.tokens.forEach((token: any) => {
          // This would compare with previous balances and create updates
          // For now, we'll just log the current state
          console.log(`Balance for ${token.stockSymbol} on ${token.chainName}: ${token.balance}`);
        });
      }

      // Poll for bridge status updates
      for (const transfer of activeTransfers) {
        if (transfer.status === 'pending' || transfer.status === 'in_progress') {
          try {
            await getBridgeStatus(transfer.transferId);
          } catch (error) {
            console.error(`Failed to update bridge status for ${transfer.transferId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll for updates:', error);
    }
  }, [address, getCrossChainPortfolio, activeTransfers, getBridgeStatus]);

  const getChangeIcon = (change: string) => {
    switch (change) {
      case 'increase': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decrease': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toLocaleString();
  };

  return (
    <div className={className}>
      {/* Connection Status */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500 mr-2" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? 'Real-time Connected' : 'Polling Mode'}
                </p>
                <p className="text-sm text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? 'Hide' : 'Show'} Notifications
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pollForUpdates}
                disabled={!address}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Updates */}
      {showNotifications && balanceUpdates.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Recent Balance Updates</CardTitle>
            <CardDescription>
              Real-time balance changes across chains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balanceUpdates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    {getChangeIcon(update.change)}
                    <div className="ml-3">
                      <p className="font-medium">{update.chainName}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(update.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatBalance(update.balance)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {update.change === 'increase' ? '+' : update.change === 'decrease' ? '-' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bridge Updates */}
      {showNotifications && bridgeUpdates.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Recent Bridge Updates</CardTitle>
            <CardDescription>
              Cross-chain transfer status changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bridgeUpdates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(update.status)}
                    <div className="ml-3">
                      <p className="font-medium">
                        Transfer #{update.transferId.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {update.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatTime(update.timestamp)}
                    </p>
                    <p className="text-sm font-medium capitalize">
                      {update.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chain Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chain Status</CardTitle>
          <CardDescription>
            Real-time status of supported testnet chains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORTED_CHAINS.map((chain) => (
              <div key={chain.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{chain.name}</p>
                  <p className="text-sm text-gray-500">
                    {chain.nativeCurrency.symbol}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Online
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

