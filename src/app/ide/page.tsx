"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function IDEPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Strategy IDE</h1>
          <p className="text-gray-300 text-lg">
            Create, test, and deploy your trading strategies in a collaborative environment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Create New Strategy</CardTitle>
              <CardDescription className="text-gray-400">
                Start building your trading algorithm from scratch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Strategy Name
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter strategy name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Describe your strategy"
                  />
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Create Strategy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">My Strategies</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your existing trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-medium">Momentum Trader v1.0</h3>
                  <p className="text-gray-400 text-sm">Last modified: 2 hours ago</p>
                  <div className="flex space-x-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Test
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Deploy
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-medium">Grid Bot v2.1</h3>
                  <p className="text-gray-400 text-sm">Last modified: 1 day ago</p>
                  <div className="flex space-x-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Test
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Deploy
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Code Editor</CardTitle>
              <CardDescription className="text-gray-400">
                Write and test your strategy code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-green-400 text-sm font-mono">
{`// Example trading strategy
function momentumStrategy(price, volume, rsi) {
  if (rsi < 30 && volume > averageVolume) {
    return "BUY";
  } else if (rsi > 70) {
    return "SELL";
  }
  return "HOLD";
}

// Backtest results
const backtestResults = {
  totalReturn: 15.3,
  sharpeRatio: 1.8,
  maxDrawdown: 8.2
};`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
