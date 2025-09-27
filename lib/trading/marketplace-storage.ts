// Shared marketplace storage for iNFT strategies
export const marketplaceStrategies = new Map<string, any>();

// Initialize with sample strategies
export const initializeSampleStrategies = () => {
  if (marketplaceStrategies.size === 0) {
    const sampleStrategies = [
      {
        tokenId: "1",
        name: "Smart TWAP Pro",
        description: "Advanced TWAP strategy with dynamic slice optimization",
        type: "TWAP",
        confidence: 92,
        price: 0.05,
        purchases: 12,
        creator: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        parameters: {
          side: "BUY",
          amount: 0.1,
          start_price: 3500,
          end_price: 3400,
          duration_hours: 2,
          slices: 8
        }
      },
      {
        tokenId: "2",
        name: "Ladder Master",
        description: "Multi-level ladder strategy for optimal price capture",
        type: "Ladder",
        confidence: 88,
        price: 0.03,
        purchases: 8,
        creator: "0x8ba1f109551bD432803012645Hac136c",
        parameters: {
          side: "SELL",
          amount: 0.5,
          start_price: 3600,
          end_price: 3400,
          steps: 15
        }
      },
      {
        tokenId: "3",
        name: "Dutch Auction Elite",
        description: "High-performance Dutch auction with market timing",
        type: "Dutch",
        confidence: 85,
        price: 0.04,
        purchases: 5,
        creator: "0x1234567890123456789012345678901234567890",
        parameters: {
          side: "SELL",
          amount: 0.2,
          start_price: 3700,
          duration_hours: 0.5
        }
      }
    ];
    
    sampleStrategies.forEach(strategy => {
      marketplaceStrategies.set(strategy.tokenId, strategy);
    });
  }
};