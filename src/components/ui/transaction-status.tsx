"use client";

import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";

export interface TransactionStatusProps {
  status: "pending" | "success" | "error";
  transactionHash?: string;
  tokenAddress?: string;
  storageId?: string;
  error?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function TransactionStatus({
  status,
  transactionHash,
  tokenAddress,
  storageId,
  error,
  onRetry,
  onClose
}: TransactionStatusProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(30);

  useEffect(() => {
    if (status === "pending") {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return (
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        );
      case "success":
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Processing your stock tokenization...";
      case "success":
        return "Stock tokenized successfully!";
      case "error":
        return "Tokenization failed";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800";
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEtherscanUrl = (hash: string) => {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  };

  return (
    <Card className={`p-6 border-2 ${getStatusColor()}`}>
      <div className="flex items-start space-x-4">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getStatusMessage()}
          </h3>
          
          {status === "pending" && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Time elapsed: {formatTime(timeElapsed)}</span>
                <span>Est. time: ~{estimatedTime}s</span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((timeElapsed / estimatedTime) * 100, 95)}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your transaction is being processed on the blockchain. This usually takes 15-60 seconds.
              </p>
            </div>
          )}
          
          {status === "success" && (
            <div className="mt-3 space-y-3">
              {transactionHash && (
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Transaction Hash</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                    </p>
                  </div>
                  <a
                    href={getEtherscanUrl(transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View on Etherscan
                  </a>
                </div>
              )}
              
              {tokenAddress && (
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Token Address</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-8)}
                    </p>
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/token/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View Token
                  </a>
                </div>
              )}
              
              {storageId && (
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Metadata Storage ID</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      {storageId.slice(0, 20)}...
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Stored on 0G</span>
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <Button onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                  View Portfolio
                </Button>
              </div>
            </div>
          )}
          
          {status === "error" && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error || "An unexpected error occurred during tokenization."}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button onClick={onRetry} className="flex-1">
                  Try Again
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
