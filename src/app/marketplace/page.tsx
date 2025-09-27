"use client";

import React, { useState, useEffect } from "react";

interface Asset {
  name: string;
  ticker: string;
  pythPriceId: string;
  price?: number;
}

// Mock data for supported assets
const SUPPORTED_ASSETS: Asset[] = [
  {
    name: "Bitcoin",
    ticker: "BTC",
    pythPriceId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  },
  {
    name: "Ethereum",
    ticker: "ETH",
    pythPriceId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  },
  {
    name: "Solana",
    ticker: "SOL",
    pythPriceId:
      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  },
];

export default function MarketTable(): JSX.Element {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  async function fetchAllData(): Promise<void> {
    try {
      // Mock price data for demonstration
      const mockPrices = [45000, 3000, 100]; // BTC, ETH, SOL prices

      const assetsWithPrices: Asset[] = SUPPORTED_ASSETS.map((asset, index) => {
        return { ...asset, price: mockPrices[index] };
      });

      setAssets(assetsWithPrices);
    } catch (error) {
      console.error("Failed to fetch prices:", error);
      setAssets(SUPPORTED_ASSETS);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchAllData();
  }, []);

  if (!mounted) {
    // Render loading UI on server and during initial hydration
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading market data...</div>
      </div>
    );
  }

  if (isLoading) {
    // Render loading UI after mounted but still fetching data
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Marketplace</h1>
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  24h %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Market Cap
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {assets.map((asset, index) => (
                <tr
                  key={asset.ticker}
                  className="hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {asset.name}
                    </div>
                    <div className="text-sm text-gray-400">{asset.ticker}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ${asset.price ? asset.price.toLocaleString() : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {/* Placeholder */}
                    --
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {/* Placeholder */}
                    --
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
