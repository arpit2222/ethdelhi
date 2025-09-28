"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { ChainSelector, ChainDisplay } from "./chain-selector";
import { useCrossChainBridge } from "../../hooks/useCrossChainBridge";
import { useStockTokens, StockTokenData } from "../../hooks/useStockTokens";
import { ArrowRight, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface BridgeInterfaceProps {
  className?: string;
  onBridgeComplete?: (transferId: string) => void;
}

export function BridgeInterface({ className, onBridgeComplete }: BridgeInterfaceProps) {
  const { address } = useAccount();
  const { 
    initiateBridge, 
    estimateBridgeFee, 
    getAvailableChains, 
    isLoading, 
    error, 
    clearError 
  } = useCrossChainBridge();
  
  const { getUserStockTokens } = useStockTokens();
  
  const [sourceChainId, setSourceChainId] = useState<number>(11155111); // Default to Sepolia
  const [destChainId, setDestChainId] = useState<number>(44787); // Default to Celo Alfajores
  const [selectedToken, setSelectedToken] = useState<StockTokenData | null>(null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [availableTokens, setAvailableTokens] = useState<StockTokenData[]>([]);
  const [feeEstimate, setFeeEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [bridgeStep, setBridgeStep] = useState<'select' | 'confirm' | 'processing' | 'completed' | 'error'>('select');
  const [transferId, setTransferId] = useState<string | null>(null);

  // Load available tokens for source chain
  useEffect(() => {
    if (address && sourceChainId) {
      loadTokens();
    }
  }, [address, sourceChainId]);

  // Estimate fees when parameters change
  useEffect(() => {
    if (selectedToken && amount && sourceChainId && destChainId) {
      estimateFees();
    }
  }, [selectedToken, amount, sourceChainId, destChainId]);

  const loadTokens = async () => {
    try {
      const response = await getUserStockTokens(sourceChainId);
      if (response.success && response.portfolio) {
        setAvailableTokens(response.portfolio.tokens);
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
    }
  };

  const estimateFees = async () => {
    if (!selectedToken || !amount) return;
    
    setIsEstimating(true);
    try {
      const estimate = await estimateBridgeFee(
        sourceChainId.toString(),
        destChainId.toString(),
        amount
      );
      setFeeEstimate(estimate);
    } catch (error) {
      console.error("Failed to estimate fees:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleBridge = async () => {
    if (!selectedToken || !amount || !address) return;

    setBridgeStep('processing');
    clearError();

    try {
      const response = await initiateBridge({
        sourceChain: sourceChainId.toString(),
        destChain: destChainId.toString(),
        tokenAddress: selectedToken.tokenAddress,
        amount,
        recipient: recipient || address,
      });

      if (response.success && response.transferId) {
        setTransferId(response.transferId);
        setBridgeStep('completed');
        onBridgeComplete?.(response.transferId);
      } else {
        setBridgeStep('error');
      }
    } catch (error) {
      console.error("Bridge failed:", error);
      setBridgeStep('error');
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'select': return <AlertCircle className="w-5 h-5" />;
      case 'confirm': return <Clock className="w-5 h-5" />;
      case 'processing': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'select': return 'Select Transfer Details';
      case 'confirm': return 'Confirm Bridge Transfer';
      case 'processing': return 'Processing Bridge Transfer';
      case 'completed': return 'Bridge Transfer Initiated';
      case 'error': return 'Bridge Transfer Failed';
      default: return 'Bridge Transfer';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          {getStepIcon(bridgeStep)}
          <span className="ml-2">{getStepTitle(bridgeStep)}</span>
        </CardTitle>
        <CardDescription>
          Transfer RWA tokens between supported testnet chains
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center">
              <XCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {bridgeStep === 'select' && (
          <>
            {/* Source Chain Selection */}
            <div className="space-y-2">
              <Label>Source Chain</Label>
              <ChainSelector
                selectedChainId={sourceChainId}
                onChainSelect={setSourceChainId}
                label="Select source chain"
              />
            </div>

            {/* Destination Chain Selection */}
            <div className="space-y-2">
              <Label>Destination Chain</Label>
              <ChainSelector
                selectedChainId={destChainId}
                onChainSelect={setDestChainId}
                label="Select destination chain"
              />
            </div>

            {/* Token Selection */}
            <div className="space-y-2">
              <Label>Select Token to Bridge</Label>
              <select
                value={selectedToken?.tokenAddress || ""}
                onChange={(e) => {
                  const token = availableTokens.find(t => t.tokenAddress === e.target.value);
                  setSelectedToken(token || null);
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a token</option>
                {availableTokens.map((token) => (
                  <option key={token.tokenAddress} value={token.tokenAddress}>
                    {token.stockSymbol} - {token.companyName} (Balance: {formatAmount(token.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount to Bridge</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.000001"
                />
                {selectedToken && (
                  <Button
                    variant="outline"
                    onClick={() => setAmount(selectedToken.balance)}
                  >
                    Max
                  </Button>
                )}
              </div>
              {selectedToken && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Available: {formatAmount(selectedToken.balance)} {selectedToken.stockSymbol}
                </p>
              )}
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label>Recipient Address (Optional)</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={address || "Enter recipient address"}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Leave empty to send to your connected wallet
              </p>
            </div>

            {/* Fee Estimate */}
            {feeEstimate && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Bridge Fee Estimate
                </h4>
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <div>Estimated Fee: {feeEstimate.estimatedFee}</div>
                  <div>Estimated Time: {feeEstimate.estimatedTime}</div>
                  <div>Available Resolvers: {feeEstimate.availableResolvers}</div>
                </div>
              </div>
            )}

            {isEstimating && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Estimating fees...</span>
              </div>
            )}

            <Button
              onClick={() => setBridgeStep('confirm')}
              disabled={!selectedToken || !amount || isLoading || isEstimating}
              className="w-full"
            >
              Continue to Confirmation
            </Button>
          </>
        )}

        {bridgeStep === 'confirm' && (
          <>
            {/* Transfer Summary */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Transfer Summary</h4>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div>
                  <Label className="text-sm text-gray-500">From</Label>
                  <ChainDisplay chainId={sourceChainId} />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">To</Label>
                  <ChainDisplay chainId={destChainId} />
                </div>
              </div>

              {selectedToken && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{selectedToken.stockSymbol}</span>
                    <span className="text-sm text-gray-500">{selectedToken.companyName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Amount:</span>
                    <span className="font-medium">{formatAmount(amount)} {selectedToken.stockSymbol}</span>
                  </div>
                </div>
              )}

              {feeEstimate && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex justify-between items-center">
                    <span>Bridge Fee:</span>
                    <span className="font-medium">{feeEstimate.estimatedFee}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Estimated Time:</span>
                    <span className="font-medium">{feeEstimate.estimatedTime}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setBridgeStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleBridge}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Initiating Bridge...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Initiate Bridge
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {bridgeStep === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h4 className="text-lg font-medium mb-2">Processing Bridge Transfer</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Creating HTLC escrows and coordinating with resolver network...
            </p>
          </div>
        )}

        {bridgeStep === 'completed' && transferId && (
          <div className="text-center py-8">
            <CheckCircle className="w-8 h-8 mx-auto mb-4 text-green-500" />
            <h4 className="text-lg font-medium mb-2">Bridge Transfer Initiated</h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Your bridge transfer has been successfully initiated.
            </p>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300">
                Transfer ID: {transferId}
              </p>
            </div>
            <Button
              onClick={() => {
                setBridgeStep('select');
                setTransferId(null);
                setSelectedToken(null);
                setAmount("");
                setRecipient("");
              }}
              className="mt-4"
            >
              Start New Transfer
            </Button>
          </div>
        )}

        {bridgeStep === 'error' && (
          <div className="text-center py-8">
            <XCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <h4 className="text-lg font-medium mb-2">Bridge Transfer Failed</h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              There was an error initiating your bridge transfer.
            </p>
            <Button
              onClick={() => setBridgeStep('select')}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

