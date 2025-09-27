"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Clock, CheckCircle, AlertCircle, Play, Square, Plus } from 'lucide-react';
import StrategyMarketplace from '../component/trading/StrategyMarketplace';

interface Strategy {
  id: string;
  mode: string;
  side: string;
  status: string;
  created_at: number;
  expires_at?: number;
  progress?: number;
  message?: string;
  original_text?: string;
}

interface BotStatus {
  running: boolean;
  current_price: number;
  price_history: number[];
  active_strategies: Strategy[];
  last_update: number;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStrategy, setNewStrategy] = useState('');
  const [isAddingStrategy, setIsAddingStrategy] = useState(false);
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  
  // AI Strategy Generation States
  const [aiInput, setAiInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // iNFT Minting States
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [strategyPrice, setStrategyPrice] = useState(0.01);
  const [isMinting, setIsMinting] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [mintedINFTs, setMintedINFTs] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotStatus = async () => {
    try {
      // Use live simulation for realistic data
      const response = await fetch('/api/live-simulation');
      const data = await response.json();
      
      setBotStatus({
        running: data.running,
        current_price: data.currentPrice,
        price_history: data.priceHistory.map((p: any) => p.price),
        active_strategies: data.strategies,
        last_update: data.lastUpdate
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch bot status:', error);
      setLoading(false);
    }
  };

  const startBot = async (mode: 'arbitrum' | 'solana' | 'background') => {
    setIsStartingBot(true);
    try {
      const response = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchBotStatus(); // Refresh status
        alert(`Bot started in ${mode} mode!`);
      } else {
        alert(`Failed to start bot: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to start bot:', error);
      alert('Failed to start bot');
    } finally {
      setIsStartingBot(false);
    }
  };

  const stopBot = async () => {
    setIsStoppingBot(true);
    try {
      const response = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchBotStatus(); // Refresh status
        alert('Bot stopped successfully!');
      } else {
        alert(`Failed to stop bot: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to stop bot:', error);
      alert('Failed to stop bot');
    } finally {
      setIsStoppingBot(false);
    }
  };

  const addStrategy = async () => {
    if (!newStrategy.trim()) return;
    
    setIsAddingStrategy(true);
    try {
      const response = await fetch('/api/strategy-executor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategy: newStrategy 
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setNewStrategy('');
        await fetchBotStatus(); // Refresh status
        alert(`Strategy added successfully: ${data.message}`);
      } else {
        alert(`Failed to add strategy: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to add strategy:', error);
      alert('Failed to add strategy');
    } finally {
      setIsAddingStrategy(false);
    }
  };

  // AI Strategy Generation Functions
  const generateAIStrategy = async () => {
    if (!aiInput.trim()) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai-strategy-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: aiInput,
          currentPrice: botStatus?.current_price
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.strategy) {
        // Convert AI strategy to executable format
        const strategyText = convertAIStrategyToText(data.strategy);
        setNewStrategy(strategyText);
        setAiInput('');
        
        alert(`🤖 AI Generated Strategy: ${data.strategy.description}\nConfidence: ${data.strategy.confidence}%`);
      } else {
        alert(`❌ AI Strategy Generation Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('AI Strategy Generation Error:', error);
      alert('Failed to generate AI strategy');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const convertAIStrategyToText = (strategy: any): string => {
    const { type, parameters } = strategy;
    
    switch (type) {
      case 'TWAP':
        return `TWAP ${parameters.side.toLowerCase()} ${parameters.amount} ETH from ${parameters.start_price} to ${parameters.end_price} over ${parameters.duration_hours}h in ${parameters.slices} slices`;
      
      case 'Ladder':
        return `Ladder ${parameters.side.toLowerCase()} ${parameters.amount} ETH from ${parameters.start_price} to ${parameters.end_price} in ${parameters.steps} steps`;
      
      case 'Dutch':
        return `Dutch auction ${parameters.side.toLowerCase()} ${parameters.amount} ETH starting at ${parameters.start_price} over ${parameters.duration_hours}h`;
      
      default:
        return `Simple ${parameters.side.toLowerCase()} ${parameters.amount} ETH at ${parameters.limit_price}`;
    }
  };

  // iNFT Minting Functions
  const mintStrategyAsINFT = async () => {
    if (!newStrategy || !strategyName) return;
    
    setIsMinting(true);
    try {
      // First generate the strategy details
      const strategyResponse = await fetch('/api/ai-strategy-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: newStrategy,
          currentPrice: botStatus?.current_price
        })
      });
      
      const strategyData = await strategyResponse.json();
      
      if (!strategyData.success) {
        alert('Failed to generate strategy details');
        return;
      }
      
      // Then mint as iNFT
      const mintResponse = await fetch('/api/mint-strategy-inft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: strategyData.strategy,
          strategyName,
          strategyDescription: strategyDescription || strategyData.strategy.description,
          price: strategyPrice,
          creator: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        })
      });
      
      const mintResult = await mintResponse.json();
      
      if (mintResult.success) {
        alert(`🎨 Strategy minted as iNFT!
Token ID: ${mintResult.iNFT.tokenId}
Transaction: ${mintResult.iNFT.transactionHash}
Marketplace: ${mintResult.iNFT.marketplaceUrl}`);
        
        // Reset form
        setStrategyName('');
        setStrategyDescription('');
        setStrategyPrice(0.01);
        
        // Add to minted list
        setMintedINFTs(prev => [...prev, mintResult.iNFT]);
      } else {
        alert(`❌ Failed to mint iNFT: ${mintResult.error}`);
      }
      
    } catch (error) {
      console.error('Minting error:', error);
      alert('Failed to mint strategy as iNFT');
    } finally {
      setIsMinting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatTime = (timestamp: number) => {
    // Normalize seconds vs milliseconds
    const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
    return new Date(ms).toLocaleTimeString();
  };

  const chartData = botStatus?.price_history.map((price, index) => ({
    time: index,
    price: price,
  })) || [];

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 flex items-center">
            <Activity className="mr-3 text-blue-400" />
            Trading Bot Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Monitor your automated trading strategies in real-time
          </p>
        </div>

        {/* Bot Control Panel */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Bot Control</h2>
          <div className="flex flex-wrap gap-4">
            {!botStatus?.running ? (
              <>
                <button
                  onClick={() => startBot('arbitrum')}
                  disabled={isStartingBot}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isStartingBot ? 'Starting...' : 'Start Arbitrum Bot'}
                </button>
                <button
                  onClick={() => startBot('solana')}
                  disabled={isStartingBot}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isStartingBot ? 'Starting...' : 'Start Solana Bot'}
                </button>
                <button
                  onClick={() => startBot('background')}
                  disabled={isStartingBot}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isStartingBot ? 'Starting...' : 'Start Background Bot'}
                </button>
              </>
            ) : (
              <button
                onClick={stopBot}
                disabled={isStoppingBot}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="mr-2 h-4 w-4" />
                {isStoppingBot ? 'Stopping...' : 'Stop Bot'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Bot Status */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {botStatus?.running ? (
                  <CheckCircle className="h-8 w-8 text-green-400" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-400" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Bot Status</p>
                <p className="text-2xl font-semibold text-gray-100">
                  {botStatus?.running ? 'Running' : 'Stopped'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Price */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Current Price</p>
                <p className="text-2xl font-semibold text-gray-100">
                  {botStatus?.current_price ? formatPrice(botStatus.current_price) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Active Strategies */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Active Strategies</p>
                <p className="text-2xl font-semibold text-gray-100">
                  {botStatus?.active_strategies.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Last Update */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Last Update</p>
                <p className="text-2xl font-semibold text-gray-100">
                  {botStatus?.last_update ? formatTime(botStatus.last_update) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Strategy Generation */}
        {botStatus?.running && (
          <div className="bg-purple-900/10 rounded-lg border border-purple-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">🤖 AI Strategy Generator</h2>
            <p className="text-sm text-purple-300 mb-4">
              Describe your trading goal in natural language and let AI generate the optimal strategy.
            </p>
            <div className="flex gap-4">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="e.g., 'I want to buy ETH gradually over the next hour' or 'Sell my ETH at multiple price levels'"
                className="flex-1 px-4 py-2 bg-gray-900 text-gray-100 placeholder-gray-400 border border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={generateAIStrategy}
                disabled={!aiInput.trim() || isGeneratingAI}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>🤖</span>
                {isGeneratingAI ? 'Generating...' : 'Generate AI Strategy'}
              </button>
            </div>
            <p className="text-xs text-purple-300 mt-2">
              Powered by AI • Generates TWAP, Ladder, Dutch Auction, and Simple strategies
            </p>
          </div>
        )}

        {/* iNFT Minting Section */}
        {botStatus?.running && (
          <div className="bg-gradient-to-r from-purple-900/10 to-pink-900/10 rounded-lg border border-pink-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">🎨 Mint Strategy as iNFT</h2>
            <p className="text-sm text-purple-300 mb-4">
              Convert your AI-generated strategy into a tradeable Intelligent NFT on the 0G marketplace using secure encryption and metadata management.
            </p>
            
            {/* Strategy Preview */}
            {newStrategy && (
              <div className="bg-gray-800 rounded-lg border border-purple-700 p-4 mb-4">
                <h3 className="font-semibold text-purple-300 mb-2">Strategy to Mint:</h3>
                <p className="text-sm text-gray-200 bg-gray-900 p-3 rounded">{newStrategy}</p>
              </div>
            )}
            
            {/* Minting Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="Strategy Name (e.g., 'Smart TWAP Pro')"
                className="px-4 py-2 bg-gray-900 text-gray-100 placeholder-gray-400 border border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="number"
                step="0.001"
                value={strategyPrice}
                onChange={(e) => setStrategyPrice(parseFloat(e.target.value))}
                placeholder="Price in ETH (e.g., 0.01)"
                className="px-4 py-2 bg-gray-900 text-gray-100 placeholder-gray-400 border border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <textarea
              value={strategyDescription}
              onChange={(e) => setStrategyDescription(e.target.value)}
              placeholder="Strategy description for marketplace..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 text-gray-100 placeholder-gray-400 border border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
            />
            
            <div className="flex gap-4">
              <button
                onClick={mintStrategyAsINFT}
                disabled={!newStrategy || !strategyName || isMinting}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>🎨</span>
                {isMinting ? 'Minting iNFT...' : 'Mint as iNFT'}
              </button>
              
              <button
                onClick={() => setShowMarketplace(true)}
                className="px-6 py-2 bg-purple-900/20 text-purple-300 rounded-lg hover:bg-purple-900/30 flex items-center gap-2"
              >
                <span>🏪</span>
                Marketplace
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/10 rounded-lg border border-blue-700">
              <h4 className="font-semibold text-blue-300 mb-2">🔒 Security Features:</h4>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• Encrypted metadata storage on 0G Storage</li>
                <li>• Secure key sealing for owner access</li>
                <li>• Proof-based execution authorization</li>
                <li>• ERC-7857 compliant iNFT standard</li>
              </ul>
            </div>
            
            <p className="text-xs text-purple-300 mt-2">
              Powered by 0G Network iNFTs • Tradeable on 0G Marketplace • Secure & Decentralized
            </p>
          </div>
        )}

        {/* Add Strategy Form */}
        {botStatus?.running && (
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Add New Strategy</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                placeholder="e.g., TWAP buy 0.1 ETH from 3500 to 3400 over 1h in 5 slices"
                className="flex-1 px-4 py-2 bg-gray-900 text-gray-100 placeholder-gray-400 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addStrategy}
                disabled={isAddingStrategy || !newStrategy.trim()}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isAddingStrategy ? 'Adding...' : 'Add Strategy'}
              </button>
            </div>
          </div>
        )}

        {/* Strategy Examples */}
        <div className="bg-blue-900/10 rounded-lg border border-blue-700 p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">💡 Strategy Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-blue-700/50">
              <h4 className="font-semibold text-blue-300 mb-2">TWAP (Time-Weighted Average Price)</h4>
              <p className="text-sm text-blue-200 mb-2">Buy/sell over time to minimize market impact</p>
              <code className="text-xs bg-blue-900/20 text-blue-200 p-2 rounded block">TWAP buy 0.1 ETH from 3500 to 3400 over 1h in 5 slices</code>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-blue-700/50">
              <h4 className="font-semibold text-blue-300 mb-2">Ladder Strategy</h4>
              <p className="text-sm text-blue-200 mb-2">Buy/sell at multiple price levels</p>
              <code className="text-xs bg-blue-900/20 text-blue-200 p-2 rounded block">Ladder buy 0.5 ETH from 3600 to 3400 in 10 steps</code>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-blue-700/50">
              <h4 className="font-semibold text-blue-300 mb-2">Dutch Auction</h4>
              <p className="text-sm text-blue-200 mb-2">Sell with decreasing price over time</p>
              <code className="text-xs bg-blue-900/20 text-blue-200 p-2 rounded block">Dutch auction sell 0.2 ETH starting at 3800 over 30m</code>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Price History</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(value: number) => `${value}s ago`}
                />
                <YAxis 
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatPrice(value), 'Price']}
                  labelFormatter={(label: number) => `${label}s ago`}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#60A5FA" 
                  strokeWidth={2}
                  dot={{ fill: '#60A5FA', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#60A5FA', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-gray-400 text-center">
            Real-time ETH/USD price data from Pyth Network
          </p>
        </div>

        {/* Active Strategies */}
        {botStatus?.active_strategies && botStatus.active_strategies.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Strategies</h2>
            <div className="space-y-4">
              {botStatus.active_strategies.map((strategy) => (
                <div key={strategy.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-100">
                        {strategy.mode.toUpperCase()} - {strategy.side}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Created: {formatTime(strategy.created_at)}
                      </p>
                      {strategy.expires_at && (
                        <p className="text-sm text-gray-400">
                          Expires: {formatTime(strategy.expires_at)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
                        {strategy.status}
                      </span>
                      {strategy.progress !== undefined && (
                        <div className="mt-2">
                          <div className="w-32 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${strategy.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{strategy.progress}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {strategy.message && (
                    <div className="mt-3 text-sm text-blue-300 bg-blue-900/20 p-2 rounded">
                      {strategy.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Marketplace Modal */}
      {showMarketplace && (
        <StrategyMarketplace 
          isOpen={showMarketplace} 
          onClose={() => setShowMarketplace(false)} 
        />
      )}
    </div>
  );
}