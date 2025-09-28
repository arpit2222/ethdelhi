"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Trading Dashboard</h1>
          <p className="text-gray-300 text-lg">
            Monitor your portfolio performance and trading activities in real-time.
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-green-400">$24,567.89</p>
                <p className="text-xs text-green-400">+2.34% (24h)</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Active Strategies</p>
                <p className="text-2xl font-bold text-white">7</p>
                <p className="text-xs text-gray-400">3 profitable</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-2xl font-bold text-blue-400">$12,456</p>
                <p className="text-xs text-gray-400">45 trades</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-purple-400">1.84</p>
                <p className="text-xs text-green-400">Excellent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Strategies */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Active Strategies</CardTitle>
              <CardDescription className="text-gray-400">
                Currently running trading algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-medium">Momentum Trader</h3>
                      <p className="text-gray-400 text-sm">ETH/USDC</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">+$1,234</p>
                      <p className="text-xs text-gray-400">+12.5%</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Configure
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-medium">Grid Bot</h3>
                      <p className="text-gray-400 text-sm">BTC/USDT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">+$856</p>
                      <p className="text-xs text-gray-400">+8.2%</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Trades</CardTitle>
              <CardDescription className="text-gray-400">
                Latest trading activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">BUY ETH</p>
                    <p className="text-gray-400 text-xs">2 minutes ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm">+$45.20</p>
                    <p className="text-gray-400 text-xs">2.1 ETH</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">SELL BTC</p>
                    <p className="text-gray-400 text-xs">15 minutes ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 text-sm">-$23.50</p>
                    <p className="text-gray-400 text-xs">0.05 BTC</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">BUY USDC</p>
                    <p className="text-gray-400 text-xs">1 hour ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm">+$12.80</p>
                    <p className="text-gray-400 text-xs">500 USDC</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Portfolio Performance</CardTitle>
              <CardDescription className="text-gray-400">
                30-day performance chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Performance chart will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
