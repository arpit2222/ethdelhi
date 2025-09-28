"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { ChainDisplay } from "./chain-selector";
import { useStockTokens, StockTokenData } from "../../hooks/useStockTokens";
import { useCrossChainBridge } from "../../hooks/useCrossChainBridge";
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ExternalLink,
  ArrowLeftRight,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

interface CrossChainPortfolioProps {
  className?: string;
  onBridgeToken?: (token: StockTokenData) => void;
  onViewDetails?: (token: StockTokenData) => void;
}

export function CrossChainPortfolio({ 
  className, 
  onBridgeToken, 
  onViewDetails 
}: CrossChainPortfolioProps) {
  const { address } = useAccount();
  const { getCrossChainPortfolio, isLoading, error } = useStockTokens();
  const { activeTransfers } = useCrossChainBridge();
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [filteredTokens, setFilteredTokens] = useState<StockTokenData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'chain' | 'date'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showValues, setShowValues] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load portfolio data
  useEffect(() => {
    if (address) {
      loadPortfolio();
    }
  }, [address]);

  // Filter and sort tokens
  useEffect(() => {
    if (!portfolio?.tokens) return;

    let filtered = portfolio.tokens;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(token =>
        token.stockSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by chain
    if (selectedChain) {
      filtered = filtered.filter(token => token.chainId === selectedChain);
    }

    // Sort tokens
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.stockSymbol;
          bValue = b.stockSymbol;
          break;
        case 'value':
          aValue = parseFloat(a.totalValue);
          bValue = parseFloat(b.totalValue);
          break;
        case 'chain':
          aValue = a.chainName;
          bValue = b.chainName;
          break;
        case 'date':
          aValue = a.tokenizationDate;
          bValue = b.tokenizationDate;
          break;
        default:
          aValue = parseFloat(a.totalValue);
          bValue = parseFloat(b.totalValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTokens(filtered);
  }, [portfolio, searchTerm, selectedChain, sortBy, sortOrder]);

  const loadPortfolio = async () => {
    try {
      const response = await getCrossChainPortfolio();
      if (response.success && response.portfolio) {
        setPortfolio(response.portfolio);
      }
    } catch (error) {
      console.error("Failed to load portfolio:", error);
    }
  };

  const refreshPortfolio = async () => {
    setIsRefreshing(true);
    await loadPortfolio();
    setIsRefreshing(false);
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getBridgeStatus = (token: StockTokenData) => {
    const activeTransfer = activeTransfers.find(transfer => 
      transfer.tokenAddress === token.tokenAddress && 
      transfer.sourceChain === token.chainId.toString()
    );
    return activeTransfer?.status || 'available';
  };

  const getBridgeStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 dark:text-green-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBridgeStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  if (!address) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Connect your wallet to view your cross-chain RWA portfolio
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !portfolio) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading portfolio...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Package className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              Failed to Load Portfolio
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={refreshPortfolio} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {showValues ? `$${formatAmount(portfolio?.totalValue || "0")}` : "***"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio?.totalTokens || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chains</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolio?.crossChainSummary ? Object.keys(portfolio.crossChainSummary).length : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bridges</CardTitle>
            <Bridge className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTransfers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Chain Filter */}
            <div className="w-full md:w-48">
              <select
                value={selectedChain || ""}
                onChange={(e) => setSelectedChain(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Chains</option>
                {portfolio?.crossChainSummary && Object.entries(portfolio.crossChainSummary).map(([chainId, summary]) => (
                  <option key={chainId} value={chainId}>
                    {summary.chainName} ({summary.tokenCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="w-full md:w-48">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy as any);
                  setSortOrder(newSortOrder as any);
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="value-desc">Value (High to Low)</option>
                <option value="value-asc">Value (Low to High)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="chain-asc">Chain (A to Z)</option>
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValues(!showValues)}
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPortfolio}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTokens.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No tokens found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedChain 
                ? "Try adjusting your search or filter criteria"
                : "Start by tokenizing your first stock"
              }
            </p>
          </div>
        ) : (
          filteredTokens.map((token) => {
            const bridgeStatus = getBridgeStatus(token);
            return (
              <Card key={`${token.tokenAddress}-${token.chainId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{token.stockSymbol}</CardTitle>
                      <CardDescription>{token.companyName}</CardDescription>
                    </div>
                    <ChainDisplay chainId={token.chainId} showIcon={true} />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Balance</span>
                    <span className="font-medium">
                      {showValues ? formatAmount(token.balance) : "***"} {token.stockSymbol}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Value</span>
                    <span className="font-bold text-green-400">
                      {showValues ? `$${formatAmount(token.totalValue)}` : "***"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Price per Share</span>
                    <span className="font-medium">
                      {showValues ? `$${formatAmount(token.pricePerShare)}` : "***"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Bridge Status</span>
                    <span className={`text-sm font-medium ${getBridgeStatusColor(bridgeStatus)}`}>
                      {getBridgeStatusText(bridgeStatus)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Tokenized</span>
                    <span className="text-sm">{formatDate(token.tokenizationDate)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails?.(token)}
                      className="flex-1"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBridgeToken?.(token)}
                      disabled={bridgeStatus !== 'available'}
                      className="flex-1"
                    >
                      <Bridge className="w-3 h-3 mr-1" />
                      Bridge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
