"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function BridgePage() {
  const [fromChain, setFromChain] = useState('Ethereum');
  const [toChain, setToChain] = useState('Arbitrum');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('ETH');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Cross-Chain Bridge</h1>
          <p className="text-gray-300 text-lg">
            Transfer your assets seamlessly between different blockchain networks.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Bridge Assets</CardTitle>
              <CardDescription className="text-gray-400">
                Select source and destination chains, then enter the amount to transfer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From Chain */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Chain
                </label>
                <select 
                  value={fromChain}
                  onChange={(e) => setFromChain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Optimism">Optimism</option>
                  <option value="Base">Base</option>
                </select>
              </div>

              {/* To Chain */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To Chain
                </label>
                <select 
                  value={toChain}
                  onChange={(e) => setToChain(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Optimism">Optimism</option>
                  <option value="Base">Base</option>
                </select>
              </div>

              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token
                </label>
                <select 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="WBTC">WBTC</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                  >
                    MAX
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Balance: 2.5 {token}
                </p>
              </div>

              {/* Bridge Button */}
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3"
                disabled={!amount || fromChain === toChain}
              >
                {fromChain === toChain ? 'Select Different Chains' : `Bridge ${amount} ${token}`}
              </Button>

              {/* Bridge Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Bridge Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated Time:</span>
                    <span className="text-white">5-10 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bridge Fee:</span>
                    <span className="text-white">0.001 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Fee:</span>
                    <span className="text-white">~$15</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bridges */}
        <div className="mt-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Bridges</CardTitle>
              <CardDescription className="text-gray-400">
                Your recent cross-chain transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">1.5 ETH</p>
                    <p className="text-gray-400 text-xs">Ethereum → Arbitrum</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm">Completed</p>
                    <p className="text-gray-400 text-xs">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">500 USDC</p>
                    <p className="text-gray-400 text-xs">Polygon → Ethereum</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-sm">Pending</p>
                    <p className="text-gray-400 text-xs">15 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">0.1 WBTC</p>
                    <p className="text-gray-400 text-xs">Arbitrum → Optimism</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm">Completed</p>
                    <p className="text-gray-400 text-xs">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
