import { useState, useEffect } from 'react';

interface MarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StrategyMarketplace({ isOpen, onClose }: MarketplaceProps) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchMarketplaceStrategies();
    }
  }, [isOpen]);

  const fetchMarketplaceStrategies = async () => {
    try {
      const response = await fetch('/api/strategy-marketplace');
      const data = await response.json();
      
      if (data.success) {
        setStrategies(data.strategies || []);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseStrategy = async (tokenId: string) => {
    try {
      const response = await fetch('/api/strategy-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          tokenId,
          buyer: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('🎉 Strategy purchased successfully!');
        fetchMarketplaceStrategies();
      } else {
        alert('❌ Failed to purchase strategy');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to purchase strategy');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">🏪 0G Strategy Marketplace</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <p className="text-gray-600 mt-2">Discover and purchase AI-generated trading strategies as iNFTs</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading strategies...</div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">No strategies available yet</h3>
              <p>Be the first to mint a trading strategy iNFT! 🚀</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategies.map((strategy) => (
                <div key={strategy.tokenId} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-lg mb-2">{strategy.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{strategy.description}</p>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Type:</span>
                      <span className="font-semibold">{strategy.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Confidence:</span>
                      <span className="font-semibold">{strategy.confidence}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Price:</span>
                      <span className="font-semibold">{strategy.price} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Purchases:</span>
                      <span className="font-semibold">{strategy.purchases}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => purchaseStrategy(strategy.tokenId)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Purchase for {strategy.price} ETH
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

